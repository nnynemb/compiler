import express from 'express';
import {
    createSession,
    getSessions,
    getSessionById,
    updateSession,
} from '../controllers/session.controller.js';

const router = express.Router();

// Define session routes
router.post('/', createSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
router.put('/:id', updateSession);

export default router;