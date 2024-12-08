const mongoose = require('mongoose');

// Replace with your MongoDB connection string
const uri = "mongodb://localhost:27017/mydatabase";

// Connect to MongoDB
mongoose.connect(uri, {
    useNewUrlParser: true, // Use the new URL parser
    useUnifiedTopology: true // Use the new Server Discover and Monitoring engine
})
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Error connecting to MongoDB:", err));
