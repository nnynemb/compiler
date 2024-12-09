// Import express
import express from 'express';
import runCode from './util/runCode.js';
import cors from "cors";
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import mongoose from "mongoose"; // MongoDB ODM
import connect from "./config/db.config.js"; // Your DB connection utility

// Initialize the app
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Session Schema
const sessionSchema = new mongoose.Schema({
  language: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Mongoose Model
const Session = mongoose.model("Session", sessionSchema);

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

  type Query {
    getSession(id: ID!): Session
  }

  type Mutation {
    generateSession(language: String!, content: String!): Session
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
  await connect(); // Connect to MongoDB
});
