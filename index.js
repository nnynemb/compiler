// Import express
import express from 'express';
import runCode from './util/runCode.js';
import cors from "cors";
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import connect from "./config/db.config.js"; // Your DB connection utility
import Session from './modules/session/session.model.js';
import User from './modules/user/user.model.js';

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
    try{
       const user = await User.findById(id);
       if(!user){
          throw new Error(`User not found`);
       }
       return user;
    } catch(error){
      throw new Error(`Error fetching user: ${error.message}`);
    }
  },

  // Update a session
  updateSession: async ({ id, language, content }) => {
    try {
      // Create an object to store fields to update
      const updates = {};
      if (language) updates.language = language;
      if (content) updates.content = content;

      // Find the session by ID and update it
      const updatedSession = await Session.findByIdAndUpdate(
        id,
        { ...updates }, // Update fields and set `updatedAt`
        { new: true } // Return the updated document
      );

      if (!updatedSession) {
        throw new Error("Session not found");
      }
      return updatedSession;
    } catch (error) {
      throw new Error(`Error updating session: ${error.message}`);
    }
  },

  // registeer a new user - mutation
  registerUser: async ({ username, email }) => {
     try {
        const user = new User({username, email});
        await user.save();
        return user;
     } catch (error) {
       throw new Error(`Error registering user: ${error.message}`);
     }
  }
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
