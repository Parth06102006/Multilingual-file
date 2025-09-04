import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { PDF } from "../models/pdf.model.js";
import {createClient} from '@supabase/supabase-js'
import { extractPageWiseText } from "../utils/pdfExtractor.js";
import { GoogleGenAI } from "@google/genai";
import { detectLanguage } from "../utils/languageDetection.js";
import {QdrantClient} from '@qdrant/js-client-rest';
import {v4 as uuidv4} from 'uuid'

async function generateAndStorePageEmbeddings(pdfId,pages,userId)
{
    const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY_3})
    const client = new QdrantClient({
        url:process.env.QDRANT_URL,
        apiKey:process.env.QDRANT_API_KEY
    })
    try {
        const pageTexts = pages.map(p=>p.content);
        console.log(pageTexts)
        const response = await ai.models.embedContent({
            model:"gemini-embedding-001",
            // model:"gemini-2.5-pro",
            contents:pageTexts
        })

        const points = response.embeddings.map((embedding,idx)=>({
            id:uuidv4(),
            vector:embedding.values,
            payload:{
                pdfId,
                pageNumber:pages[idx].pageNumber,
                userId
            }
        }))
        console.log('HEy')
        //////
        try {
            console.log('About to upsert points:', points.length);
            
            const result = await client.upsert("pdf_pages",
            {
                wait:true,
                points: points
            });
            
            console.log("Upsert result ******\n", result);
        } catch (error) {
            console.error("Upsert error:", error);
            console.error("Error details:", error.message);
            if (error.response) {
                console.error("Response data:", error.response.data);
            }
        }
        //////
    } catch (error) {
        console.error(error.message)
        throw new ApiError(500,'Error Uploading the PDF to vector database')
    }
}

export const pdfUpload = asyncHandler(async(req,res)=>{
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    )
    const pdfFile = req?.file;

    if(!pdfFile)
    {
        throw new ApiError(400,'No PDF File uploaded')
    }

    const pdfData = await extractPageWiseText(new Uint8Array(pdfFile.buffer));
    const totalPages = pdfData.totalPages;
    if(totalPages > 100)
    {
        throw new ApiError(400,'More than 100 pages pdf cannot be uploaded');
    }
    const pdfText = pdfData.text;

        const originalName = pdfFile.originalname;

    // Remove spaces and special characters
    const safeName = originalName
        .replace(/\s+/g, '_')       // replace spaces with underscores
        .replace(/\[|\]/g, '')      // remove square brackets
        .replace(/[^a-zA-Z0-9_.-]/g, ''); // remove any other unsafe characters

    const filePath = `public/${Date.now()}-${safeName}`;

    const { data, error } = await supabase
    .storage
    .from(`${process.env.SUPABASE_PROJECT_BUCKET}`)
    .upload(filePath, new Uint8Array(pdfFile.buffer), {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
    })
    console.log('Hey')
    
    if(error)
        {
            console.error(error.message)
            throw new ApiError(500,error.message)
        }
        
        const fileName = pdfFile.originalname;
        const file_upload_path = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${process.env.SUPABASE_PROJECT_BUCKET}/${data.path}`
        
        //to add langauage detection function otherwise done
        const languageDetected = await detectLanguage(pdfData.text)//to look at the language string after parsing through the object
        console.log('Hey')
        const pagesTextFormatted = pdfData.pagesText
            .filter(p => p.content && typeof p.content === 'string') // remove invalid pages
            .map(p => ({
                pageNumber: p.pageNumber,
                content: p.content.trim()  // optional: trim whitespace
            }));

    try {
            const newPdf = await PDF.create({
                userId:req.user,
                fileName,
                filePath:file_upload_path,
                language:languageDetected,//to add text langauge in it
                text:pagesTextFormatted,
                totalPages
            })

            if(!newPdf)
            {
                throw new ApiError(400,'Error Uploading PDF');
            }
            await generateAndStorePageEmbeddings(newPdf._id,newPdf.text,newPdf.userId)

            return res.status(200).json(new ApiResponse(200,'PDF Uploaded Successfully',{...newPdf}))
    } catch (error) {
        console.error(error.message);
        throw new ApiError(500,'Intenral Server Error Occured');
    }
})

