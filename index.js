// Import express
import express from 'express';
import runCode from './util/runCode.js';
import cors from "cors"
// Initialize the app
const app = express();

app.use(cors());
// Use express.json() to parse incoming JSON requests
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded


// Set up a simple route
app.post('/run-code', (req, res) => {
    runCode(req, res)
});

// Define the port the server will listen on
const port = 8000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
