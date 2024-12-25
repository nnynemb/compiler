import express from 'express';
import runCode from './util/runCode.js';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import connect from './config/db.config.js'; // Your DB connection utility
import Session from './modules/session/session.model.js';
import User from './modules/user/user.model.js';
import http from 'http';
import { initializeSocket } from './config/socket.config.js';
import codeQueue from './async/codeQueue.js';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Initialize the app
const app = express();
app.use(cors({
  origin: '*', // Replace '*' with specific origin(s) in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true, // Allow cookies if needed
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis client setup for rate limit (optional, for distributed systems)
const redisClient = new Redis({
  host: process.env.REDIS_URL || 'localhost', // Your Redis host
  port: process.env.REDIS_PORT || 6379,       // Your Redis port
  password: process.env.REDIS_PASSWORD || '',      // Your Redis password (if any)
});

// Set up rate limiting using express-rate-limit with optional Redis
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// Apply rate limiter to all routes
app.use(limiter);

// Set up a simple route
app.post('/run-code', async (req, res) => {
  const { code, language, sessionId } = req.body;

  try {
    // Check if a task with the same sessionId already exists in the queue
    const existingJobs = await codeQueue.getJobs(['waiting', 'active', 'delayed']);
    console.log('Existing jobs:', existingJobs);
    const isTaskAlreadyQueued = existingJobs.some(job => job.data.sessionId === sessionId);

    if (isTaskAlreadyQueued) {
      return res.status(409).send('Task with the same sessionId is already in the queue');
    }

    // Add task to Bull queue
    await codeQueue.add({ code, language, sessionId });

    // Send immediate response
    res.status(200).send('Task added to the queue');
  } catch (error) {
    console.error('Error adding task to queue:', error);
    res.status(500).send('Failed to add task to queue');
  }
});

// Define the port the server will listen on
const port = process.env.PORT || 8000;

// Set up GraphQL
// Define GraphQL schema
const schema = buildSchema(`
  type Session {
    id: ID!
    language: String!
    content: String!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    phone: String!
    createdAt: String!
    updatedAt: String!
  }

  type RegisterUser {
     username: String!
     email: String
  }

  type Query {
    getSession(id: ID!): Session
    getUser(id: ID!): User
  }

  type Mutation {
    generateSession(language: String!, content: String!): Session
    updateSession(id: ID!, language: String, content: String): Session
    registerUser(username: String, email: String): RegisterUser
  }
`);

// Define resolvers
const root = {
  // Fetch session by ID
  getSession: async ({ id }) => {
    try {
      const session = await Session.findById(id);
      if (!session) {
        throw new Error('Session not found');
      }
      return session;
    } catch (error) {
      throw new Error(`Error fetching session: ${error.message}`);
    }
  },

  // Create a new session
  generateSession: async ({ language, content }) => {
    try {
      const newSession = new Session({ language, content });
      await newSession.save();
      return newSession;
    } catch (error) {
      throw new Error(`Error creating session: ${error.message}`);
    }
  },

  // Get user by Id
  getUser: async ({ id }) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error(`User not found`);
      }
      return user;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  },

  // Update a session
  updateSession: async ({ id, language, content }) => {
    try {
      const updates = {};
      if (language) updates.language = language;
      if (content) updates.content = content;

      const updatedSession = await Session.findByIdAndUpdate(
        id,
        { ...updates },
        { new: true }
      );

      if (!updatedSession) {
        throw new Error('Session not found');
      }
      return updatedSession;
    } catch (error) {
      throw new Error(`Error updating session: ${error.message}`);
    }
  },

  // Register a new user
  registerUser: async ({ username, email }) => {
    try {
      const user = new User({ username, email });
      await user.save();
      return user;
    } catch (error) {
      throw new Error(`Error registering user: ${error.message}`);
    }
  },
};

// Set up GraphQL endpoint
app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true, // Enable GraphiQL interface
  })
);

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the server
const io = initializeSocket(server); // Pass the HTTP server to initializeSocket

// Start the server and connect to MongoDB
server.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`GraphQL API is available at http://localhost:${port}/graphql`);

  connect(); // Connect to MongoDB
});
