import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { PDF } from "../models/pdf.model.js";
import { Question } from "../models/question.model.js";
import { Text } from "../models/text.model.js";
import { Session } from "../models/session.model.js";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { translateLanguage } from "../utils/translator.js";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from '@qdrant/js-client-rest';

// ---------------- CREATE QUESTION ----------------
const question = asyncHandler(async (req, res) => {
    const { question, sessionId, title } = req.body;
    if (!question || !sessionId || !title) {
        throw new ApiError(400, 'Question, Session ID, and Title are required');
    }

    try {
        const newQuestion = await Question.create({
            userId: req.user,
            sessionId,
            questionText: question,
            title
        });

        return res.status(200).json(new ApiResponse(200, 'Question created successfully', newQuestion));
    } catch (error) {
        console.error('Error creating question:', error);
        throw new ApiError(500, 'Internal Server Error');
    }
});

// ---------------- GENERATE ANSWER ----------------
const answer = asyncHandler(async (req, res) => {
    const { questionId, sessionId, pdfIds = [], title } = req.body;

    if (!questionId || !sessionId || !title) {
        throw new ApiError(400, 'Question ID, Session ID, and Title are required');
    }

    if (!Array.isArray(pdfIds)) {
        throw new ApiError(400, 'pdfIds must be an array');
    }

    const questionDoc = await Question.findById(questionId);
    if (!questionDoc) throw new ApiError(404, 'Question not found');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const client = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY
        });

        let answerText;
        let matchedPages = [];
        let questionEmbedding;
        if (pdfIds.length > 0) {
            // Generate embedding for the question
            console.log(questionDoc.questionText)
            questionEmbedding = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: questionDoc.questionText
        });

        console.log("Embedding:", questionEmbedding.embeddings?.[0]?.values?.length);
        console.log("PDF IDs:", pdfIds);

            // Search for relevant pages in vector database
            const searchResult = await client.search("pdf_pages", {
                vector: questionEmbedding.embeddings[0].values,
                filter: {
                    must: [
                        { key: "pdfId", match: { any: pdfIds.map(String) } },
                        { key: "userId", match: { value: req.user.toString() } }
                    ]
                },
                limit: 5,
                with_payload: true
            });

            matchedPages = searchResult.map(point => ({
                pdfId: point.payload.pdfId,
                pageNumber: point.payload.pageNumber
            }));

            // Get text content from matched pages
            const texts = [];
            for (const mp of matchedPages) {
                const pdf = await PDF.findById(mp.pdfId);
                if (pdf) {
                    const page = pdf.text.find(p => p.pageNumber === mp.pageNumber);
                    if (page) texts.push(page.content);
                }
            }
            console.log('hey')
            // Generate answer with context
            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: [{
                    role: 'user',
                    parts: [{ 
                        text: `Answer this question based on the provided context. If the context doesn't contain relevant information, say so clearly.

Question: ${questionDoc.questionText}

Context: ${texts.join('\n\n')}

Please provide a clear and comprehensive answer based on the context provided.`
                    }]
                }]
            });
            answerText = result.text;
        } else {
            // Generate answer without PDF context
            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: [{
                    role: 'user',
                    parts: [{ text: `Answer this question: ${questionDoc.questionText}` }]
                }]
            });

            answerText = result.response.text();
        }

        if (!answerText) throw new ApiError(500, 'Failed to generate answer');

        // Create answer document
        const answerDoc = await Text.create({
            userId: req.user,
            questionId,
            sources: matchedPages,
            answerText,
            sessionId,
            title
        });

        // Update question with answer
        await Question.findByIdAndUpdate(questionId, { 
            answer: answerText,
            sources: matchedPages 
        });

        return res.status(200).json(new ApiResponse(200, 'Answer generated successfully', {
            answerText,
            sources: matchedPages,
            answerDoc
        }));

    } catch (error) {
        console.error('Answer generation error:', error);
        throw new ApiError(500, 'Error generating answer');
    }
});

// ---------------- GET CHAT HISTORY FOR SESSION ----------------
export const getChatHistory = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId) throw new ApiError(400, 'Session ID is required');

    try {
        // Find all questions for this session and populate answers
        const questions = await Question.find({ 
            sessionId, 
            userId: req.user 
        }).sort({ createdAt: 1 });

        // Get corresponding answers
        const history = [];
        for (const question of questions) {
            const answer = await Text.findOne({ 
                questionId: question._id,
                sessionId,
                userId: req.user 
            });

            history.push({
                _id: question._id,
                question: question.questionText,
                answer: answer?.answerText,
                sources: answer?.sources || [],
                createdAt: question.createdAt
            });
        }

        return res.status(200).json(new ApiResponse(200, 'Chat history retrieved successfully', history));
    } catch (error) {
        console.error('Error fetching chat history:', error);
        throw new ApiError(500, 'Failed to fetch chat history');
    }
});

// ---------------- GET ALL SESSIONS ----------------
export const getAllSessions = asyncHandler(async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user }).sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, 'Sessions fetched successfully', sessions));
    } catch (err) {
        console.error('Error fetching sessions:', err);
        throw new ApiError(500, 'Failed to fetch sessions');
    }
});

// ---------------- CREATE SESSION ----------------
export const createSession = asyncHandler(async (req, res) => {
    try {
        const { title, pdfIds = [] } = req.body;
        if (!title) throw new ApiError(400, 'Title is required');

        const sessionId = uuidv4();
        const session = await Session.create({ 
            userId: req.user, 
            title, 
            sessionId 
        });

        // Note: pdfIds are handled on the frontend side for selection
        // We don't need to associate PDFs with sessions in the database
        // since the frontend manages PDF selection per session

        return res.status(201).json(new ApiResponse(201, 'Session created successfully', session));
    } catch (err) {
        console.error('Error creating session:', err);
        throw new ApiError(500, 'Failed to create session');
    }
});

// ---------------- DELETE SESSION ----------------
export const deleteSession = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) throw new ApiError(400, "Session ID is required");

        // Delete all texts and questions for this session
        await Text.deleteMany({ sessionId: id, userId: req.user });
        await Question.deleteMany({ sessionId: id, userId: req.user });

        // Note: We don't delete PDFs when deleting a session
        // since PDFs should remain in the user's library
        // Only delete PDFs if they were specifically uploaded for this session
        const sessionPDFs = await PDF.find({ sessionId: id, userId: req.user });
        
        if (sessionPDFs.length > 0) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
            const client = new QdrantClient({
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY
            });

            for (const pdf of sessionPDFs) {
                try {
                    // Remove from Supabase storage
                    const filePath = pdf.filePath.split(`/${process.env.SUPABASE_PROJECT_BUCKET}/`)[1];
                    await supabase.storage.from(process.env.SUPABASE_PROJECT_BUCKET).remove([filePath]);

                    // Remove from vector database
                    await client.delete("pdf_pages", {
                        filter: { must: [{ key: "pdfId", match: { value: pdf._id.toString() } }] }
                    });
                } catch (err) {
                    console.error("Cleanup error for PDF:", pdf._id, err.message);
                }
                
                // Remove from MongoDB
                await PDF.findByIdAndDelete(pdf._id);
            }
        }

        // Finally delete the session
        const deletedSession = await Session.findOneAndDelete({ 
            sessionId: id, 
            userId: req.user 
        });

        if (!deletedSession) {
            throw new ApiError(404, "Session not found");
        }

        return res.status(200).json(new ApiResponse(200, "Session deleted successfully"));
    } catch (err) {
        console.error("Error deleting session:", err);
        throw new ApiError(500, "Failed to delete session");
    }
});

export const translateLanguageNew = async (text, pageNumber) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_2 });
  
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Translate the following text into English carefully, word by word, while keeping the same sense:\n\n${text}`
            }
          ]
        }
      ]
    });

    const translatedText = result.response.text();
    return { translatedText };
  } catch (error) {
    console.error("Gemini Translation Error:", error.message);
    throw new ApiError(500, 'Unable to Translate the PDF');
  }
};

export { question, answer };