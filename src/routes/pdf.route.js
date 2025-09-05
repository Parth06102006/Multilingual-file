import Router from 'express'
import { pdfUpload, getAllPDFs, getPDFsBySession, deletePDF } from '../controllers/pdf.controller.js'
import { authHandler } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'

const router = Router()

// PDF upload
router.route('/pdf/upload').post(authHandler, upload.single('pdfFile'), pdfUpload);

// Get all PDFs for user (main endpoint used by frontend)
router.get('/pdf/list', authHandler, getAllPDFs);

// Get PDFs by session (optional endpoint)
router.get('/pdf/session', authHandler, getPDFsBySession);

// Delete PDF
router.delete('/pdf/delete/:id', authHandler, deletePDF);

export default router;