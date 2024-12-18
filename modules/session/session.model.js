import mongoose from "mongoose";

// MongoDB Session Schema
const sessionSchema = new mongoose.Schema({
    language: { type: String, required: true },
    content: { type: String, required: true },
    userId: { type: mongoose.Types.ObjectId, required: false, ref: 'User' }
}, {
    timestamps: true
});

// Mongoose Model
const Session = mongoose.model("Session", sessionSchema);
export default Session;