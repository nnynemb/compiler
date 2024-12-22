import express from 'express';
import runCode from './util/runCode.js';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import connect from './config/db.config.js'; // Your DB connection utility
import Session from './modules/session/session.model.js';
import User from './modules/user/user.model.js';
import Redis from 'ioredis'; // Import ioredis
import http from 'http';
import { Server as SocketIoServer } from 'socket.io'; // Correct import for Socket.IO

// Create a single Redis client for both publishing and subscribing
const redisClient = new Redis({
  host: process.env.REDIS_URL, // Replace with your Redis host
  port: process.env.REDIS_PORT, // Replace with your Redis port
  password: process.env.REDIS_PASSWORD, // Add your Redis password here
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Duplicate the connection for subscribing
const redisSubscriber = redisClient.duplicate();

redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));

// Maintain a list of active sockets
let activeSockets = [];

// Wait for Redis connection to be established before using it
const connectRedis = async () => {
  try {
    // Check if Redis is already connected, if not, connect
    if (!redisClient.status || redisClient.status === 'disconnected') {
      console.log('Connecting to Redis...');
      await redisClient.connect();
    }

    if (!redisSubscriber.status || redisSubscriber.status === 'disconnected') {
      console.log('Connecting to Redis subscriber...');
      await redisSubscriber.connect();
    }

    console.log('Connected to Redis (Publisher and Subscriber)');

    // Subscribe to all channels using wildcard pattern "*"
    await redisSubscriber.psubscribe('*');
    console.log('Subscribed to all channels.');

    // Listen for messages from any channel
    redisSubscriber.on('pmessage', (pattern, channel, message) => {
      // Send message to all connected sockets
      const msg = JSON.parse(message);
      io.to(channel).emit(channel, { channel, ...msg });
    });
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
};

// Initialize the app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up a simple route
app.post('/run-code', (req, res) => {
  runCode(req, res, io);
});

// Define the port the server will listen on
const port = 8000;

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

  // Publish session
  publishSession: async ({ id, ...data }) => {
    const stringifiedData = typeof data === 'string' ? data : JSON.stringify({ ...data });
    await redisClient.publish(id, stringifiedData); // Publish to specific channel
    return { id };
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

// Create Socket.IO instance attached to the HTTP server
// Create Socket.IO instance with CORS settings
const io = new SocketIoServer(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type'], // Optional: allowed headers
    credentials: false, // Set to true if authentication (cookies, etc.) is needed
  },
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  // Listen for any event from the client
  socket.onAny((event, ...args) => {
    console.log('Received event:', event, args);
    if (event === 'joinRoom') {
      const room = args[0];
      socket.join(room); // Join the room
    } else {
      const { language, code, ...others } = args[0];
      const publisher = { id: event, language, content: code, senderSocketId: socket.id, ...others };
      root.publishSession(publisher);
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    // socket.leaveAll(); // Leave all rooms
    console.log('Socket disconnected:', socket.id);
    // Remove the socket from the list of active sockets
  });
});

// Start the server and connect to Redis and MongoDB
server.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`GraphQL API is available at http://localhost:${port}/graphql`);

  console.log("Dependent variables :", process.env.REDIS_URL, process.env.REDIS_PORT, process.env.REDIS_PASSWORD, process.env.MONGOURL, process.env.PORT);

  // Connect to Redis and WebSocket
  await connectRedis();
  connect(); // Connect to MongoDB
});
