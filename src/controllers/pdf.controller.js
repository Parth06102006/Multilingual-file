import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { PDF } from "../models/pdf.model.js";
import { createClient } from '@supabase/supabase-js';
import { extractPageWiseText } from "../utils/pdfExtractor.js";
import { GoogleGenAI } from "@google/genai";
import { detectLanguage } from "../utils/languageDetection.js";
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

/* ------------------ Helper: Generate and store embeddings ------------------ */
async function generateAndStorePageEmbeddings(pdfId, pages, userId) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_3 });
    const client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
    });

    try {
        const pageTexts = pages.map(p => p.content);

        const response = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: pageTexts
        });

        const points = response.embeddings.map((embedding, idx) => ({
            id: uuidv4(),
            vector: embedding.values,
            payload: {
                pdfId,
                pageNumber: pages[idx].pageNumber,
                userId
            }
        }));

        await client.upsert("pdf_pages", {
            wait: true,
            points: points
        });

    } catch (error) {
        console.error("Error in embeddings:", error.message);
        throw new ApiError(500, 'Error uploading PDF to vector database');
    }
}

/* ------------------ Upload PDF ------------------ */
export const pdfUpload = asyncHandler(async (req, res) => {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const pdfFile = req?.file;
    const { sessionId } = req.body;

    if (!pdfFile) throw new ApiError(400, 'No PDF file uploaded');
    // sessionId is now optional - if not provided, PDF is uploaded to general library
    const pdfSessionId = sessionId || '';

    const pdfData = await extractPageWiseText(new Uint8Array(pdfFile.buffer));
    console.log('PDF Data:', pdfData);
    
    if (pdfData.totalPages > 100) throw new ApiError(400, 'PDF cannot have more than 100 pages');

    const originalName = pdfFile.originalname;
    const safeName = originalName
        .replace(/\s+/g, '_')
        .replace(/\[|\]/g, '')
        .replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = `public/${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage
        .from(`${process.env.SUPABASE_PROJECT_BUCKET}`)
        .upload(filePath, new Uint8Array(pdfFile.buffer), {
            cacheControl: '3600',
            upsert: false,
            contentType: 'application/pdf'
        });

    if (error) {
        console.error(error.message);
        throw new ApiError(500, error.message);
    }

    const file_upload_path = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${process.env.SUPABASE_PROJECT_BUCKET}/${data.path}`;
    let newPdf = null;

    try {
        // Filter and format pages text
        const pagesTextFormatted = pdfData.pagesText
            .filter(p => p.content && typeof p.content === 'string' && p.content.trim().length > 0)
            .map(p => ({
                pageNumber: p.pageNumber,
                content: p.content.trim()
            }));

        // Create concatenated text for language detection
        let concatenatedText = '';
        if (pdfData.text && typeof pdfData.text === 'string') {
            // If pdfData.text exists and is a string, use it
            concatenatedText = pdfData.text.trim();
        } else {
            // Otherwise, concatenate from pages
            concatenatedText = pagesTextFormatted
                .map(p => p.content)
                .join(' ')
                .trim();
        }

        console.log('Text for language detection (first 500 chars):', concatenatedText.substring(0, 500));

        // Detect language using the concatenated text
        const languageDetected = await detectLanguage(concatenatedText);
        console.log('Detected language:', languageDetected);

        // Validate that we have valid text content
        if (!concatenatedText || concatenatedText.length < 10) {
            throw new ApiError(400, 'PDF contains insufficient text content for processing');
        }

        newPdf = await PDF.create({
            userId: req.user,
            sessionId: pdfSessionId,
            fileName: pdfFile.originalname,
            filePath: file_upload_path,
            language: languageDetected,
            text: pagesTextFormatted,
            totalPages: pdfData.totalPages,
            // Store the full concatenated text as well for future reference
            fullText: concatenatedText
        });

        if (!newPdf) throw new ApiError(500, 'Error saving PDF');

        await generateAndStorePageEmbeddings(newPdf._id, newPdf.text, newPdf.userId);

        return res.status(200).json(new ApiResponse(200, 'PDF uploaded successfully', {
            ...newPdf.toObject(),
            // Don't return fullText in response to keep it lightweight
            fullText: undefined
        }));

    } catch (error) {
        console.error('PDF processing error:', error.message);

        // Cleanup uploaded file
        try {
            await supabase.storage.from(process.env.SUPABASE_PROJECT_BUCKET).remove([data.path]);
        } catch (cleanupError) {
            console.error('Supabase cleanup failed:', cleanupError.message);
        }

        // Cleanup MongoDB record if created
        if (newPdf?._id) {
            try {
                await PDF.findByIdAndDelete(newPdf._id);
            } catch (cleanupError) {
                console.error('MongoDB cleanup failed:', cleanupError.message);
            }
        }

        throw new ApiError(500, 'Internal server error occurred - upload cleaned up');
    }
});

/* ------------------ Get ALL PDFs for user (not session-specific) ------------------ */
export const getAllPDFs = asyncHandler(async (req, res) => {
    // Remove sessionId requirement - fetch all PDFs for the user
    const pdfs = await PDF.find({ userId: req.user }).select('-fullText').sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, 'PDFs fetched successfully', pdfs));
});

/* ------------------ Get PDFs by session (optional endpoint) ------------------ */
export const getPDFsBySession = asyncHandler(async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) throw new ApiError(400, 'Session ID is required');

    const pdfs = await PDF.find({ userId: req.user, sessionId }).select('-fullText').sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, 'PDFs fetched successfully', pdfs));
});

/* ------------------ Get single PDF with full content (optional endpoint) ------------------ */
export const getPDFById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pdf = await PDF.findOne({ _id: id, userId: req.user });
    if (!pdf) throw new ApiError(404, 'PDF not found');
    
    return res.status(200).json(new ApiResponse(200, 'PDF fetched successfully', pdf));
});

/* ------------------ Delete PDF ------------------ */
export const deletePDF = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pdf = await PDF.findOneAndDelete({ _id: id, userId: req.user });
    if (!pdf) throw new ApiError(404, 'PDF not found');

    // Remove from Supabase storage
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        const filePath = pdf.filePath.split(`/${process.env.SUPABASE_PROJECT_BUCKET}/`)[1];
        await supabase.storage.from(process.env.SUPABASE_PROJECT_BUCKET).remove([filePath]);
    } catch (err) {
        console.error('Error deleting PDF file from Supabase:', err.message);
    }

    // Remove from vector database
    try {
        const client = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY
        });
        await client.delete("pdf_pages", {
            filter: { must: [{ key: "pdfId", match: { value: pdf._id.toString() } }] }
        });
    } catch (err) {
        console.error('Error deleting PDF embeddings from Qdrant:', err.message);
    }

    return res.status(200).json(new ApiResponse(200, 'PDF deleted successfully', pdf));
});