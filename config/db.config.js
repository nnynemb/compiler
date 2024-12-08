// Import Mongoose
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection URI (use your own URI)
const uri = process.env.MONGOURL;

const connect = () => {
    // Connect to MongoDB
    mongoose.connect(uri)
        .then(() => console.log("Connected to MongoDB"))
        .catch(err => console.error("Connection error:", err));
}

export default connect;