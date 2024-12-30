import express from 'express';
import cors from 'cors';
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
  methods: ['GET', 'POST', 'PUT'],
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

// Session Routes (Replaced GraphQL)
app.post('/sessions', async (req, res) => {
  const { language, content } = req.body;

  try {
    const newSession = new Session({ language, content });
    await newSession.save();
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).send('Failed to create session');
  }
});

app.get('/sessions', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const sessions = await Session.find().skip(skip).limit(limit);
    const totalCount = await Session.countDocuments();
    res.status(200).json({ sessions, totalCount });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).send('Failed to fetch sessions');
  }
});

app.get('/sessions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).send('Session not found');
    }
    res.status(200).json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).send('Failed to fetch session');
  }
});

app.put('/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const { language, content } = req.body;

  try {
    const updates = {};
    if (language) updates.language = language;
    if (content) updates.content = content;

    const updatedSession = await Session.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedSession) {
      return res.status(404).send('Session not found');
    }

    res.status(200).json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).send('Failed to update session');
  }
});

// User Routes
app.post('/users', async (req, res) => {
  const { username, email } = req.body;

  try {
    const user = new User({ username, email });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Failed to register user');
  }
});

// Define the port the server will listen on
const port = process.env.PORT || 8000;

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the server
initializeSocket(server); // Pass the HTTP server to initializeSocket

// Start the server and connect to MongoDB
server.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);

  connect(); // Connect to MongoDB
});
