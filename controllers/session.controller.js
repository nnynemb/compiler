import Session from '../models/session.model.js';

export const createSession = async (req, res) => {
  const { language, content } = req.body;
  const user = req.user;
  try {
    const newSession = new Session({ language, content, userId: user.user_id });
    await newSession.save();
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).send('Failed to create session');
  }
};

export const getSessions = async (req, res) => {
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
};

export const getSessionById = async (req, res) => {
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
};

export const updateSession = async (req, res) => {
  const { id } = req.params;
  const { language, content } = req.body;
  const user = req.user;
  const userId = user.user_id;
  try {
    const updates = {};
    if (language) updates.language = language;
    if (content) updates.content = content;
    const query = { _id: id, userId };
    const updatedSession = await Session.findOneAndUpdate(query, updates, { new: true });
    if (!updatedSession) {
      return res.status(404).send('Session not found');
    }
    res.status(200).json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).send('Failed to update session');
  }
};