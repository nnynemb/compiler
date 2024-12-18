// Import express
import express from 'express';
import runCode from './util/runCode.js';
import cors from "cors";
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import connect from "./config/db.config.js"; // Your DB connection utility
import Session from './modules/session/session.model.js';
import User from './modules/user/user.model.js';
import redis from "redis";

// Create Redis client for publishing
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_URL, // Replace with your Redis host
    port: process.env.REDIS_PORT, // Replace with your Redis port
  },
  password: process.env.REDIS_PASSWORD // Add your Redis password here
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function connectToRedis() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    // Perform Redis operations (example)
    await redisClient.set('mykey', 'Hello from Node.js!');
    console.log('Value set successfully');

    const value = await redisClient.get('mykey');
    console.log('Retrieved value:', value);
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
}

// Create Redis client for subscription
const redisSubscriber = redis.createClient({
  socket: {
    host: process.env.REDIS_URL, // Replace with your Redis host
    port: process.env.REDIS_PORT, // Replace with your Redis port
  },
  password: process.env.REDIS_PASSWORD // Add your Redis password here
});

redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));

async function connectRedisSubscriber() {
  try {
    await redisSubscriber.connect();
    console.log('Connected to Redis subscriber');

    // Subscribe to all channels using wildcard pattern "*"
    redisSubscriber.subscribe('your_session_id', (message) => {
      console.log('Received message from Redis channel:', message);
    });

    console.log('Subscribed to all channels.');
  } catch (err) {
    console.error('Error subscribing to Redis channels:', err);
  }
}

// Initialize the app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up a simple route
app.post('/run-code', (req, res) => {
  runCode(req, res);
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
    publishSession(id: ID!, language: String, content: String): Session
  }
`);

// Define resolvers
const root = {
  // Fetch session by ID
  getSession: async ({ id }) => {
    try {
      const session = await Session.findById(id);
      if (!session) {
        throw new Error("Session not found");
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
        throw new Error("Session not found");
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

  publishSession: async ({ id, language, content }) => {
    const data = JSON.stringify({ language, content });
    redisClient.publish(id, data);
    return { id };
  },
};

// Set up GraphQL endpoint
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true, // Enable GraphiQL interface
}));

// Start the server
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`GraphQL API is available at http://localhost:${port}/graphql`);
  await connectToRedis();
  await connectRedisSubscriber();
  await connect(); // Connect to MongoDB
});
