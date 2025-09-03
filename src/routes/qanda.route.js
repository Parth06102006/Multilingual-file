import Router from 'express'
import { authHandler } from '../middlewares/auth.middleware.js'
import { question,answer } from '../controllers/ques.controller.js'

const router = Router();

router.post('/chat/question',authHandler,question)
router.post('/chat/answer',authHandler,answer)

export default router;