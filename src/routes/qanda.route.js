import Router from 'express'
import { authHandler } from '../middlewares/auth.middleware.js'
import { 
    question, 
    answer, 
    createSession, 
    deleteSession, 
    getAllSessions, 
    getChatHistory,
    translateLanguageNew
} from '../controllers/ques.controller.js';

const router = Router();

// Question and Answer routes
router.post('/chat/question', authHandler, question);
router.post('/chat/answer', authHandler, answer);

// Session management routes
router.post('/chat/session', authHandler, createSession);
router.delete('/chat/session/:id', authHandler, deleteSession);
router.get('/chat/sessions', authHandler, getAllSessions);
router.post('/translate', authHandler, translateLanguageNew);


// Chat history route
router.get('/chat/history/:sessionId', authHandler, getChatHistory);

export default router;