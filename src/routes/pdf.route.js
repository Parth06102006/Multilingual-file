import Router from 'express'
import {pdfUpload} from '../controllers/pdf.controller.js'
import { authHandler } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/pdf/upload',pdfUpload);

export default router;