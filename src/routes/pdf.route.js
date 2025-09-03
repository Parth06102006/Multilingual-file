import Router from 'express'
import {pdfUpload} from '../controllers/pdf.controller.js'
import { authHandler } from '../middlewares/auth.middleware.js'
import {upload} from '../middlewares/multer.middleware.js'

const router = Router()

router.route('/pdf/upload').post(authHandler,upload.single('pdfFile'),pdfUpload);

export default router;