import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { PDF } from "../models/pdf.model";
import supabase from '@supabase/supabase-js'
import { extractPageWiseText } from "../utils/pdfExtractor";
import {client,ai} from '../utils/geminiQdrant.js'

async function generateAndStorePageEmbeddings(pdfId,pages,userId)
{
    try {
        const pageTexts = pages.map(p=>p.content);
        const response = await ai.models.embedContent({
            model:"gemini-embedding-001",
            contents:pageTexts
        })

        const points = response.embeddings.map((embedding,idx)=>({
            id:`${pdfId}_${pages[idx].pageNumber}`,
            vector:embedding.values,
            payload:{
                pdfId,
                pageNumber:pages[idx].pageNumber,
                userId
            }
        }))

        await client.points.upsert({
            collection_name:"pdf_pages",
            points
        })
    } catch (error) {
        console.error(error.message)
        throw new ApiError(500,'Error Uploading the PDF to vector database')
    }
}

const pdfUpload = asyncHandler(async(req,res)=>{
    const pdfFile = req?.files?.['pdfFile']

    if(!pdfFile)
    {
        throw new ApiError(400,'No PDF File uploaded')
    }

    const pdfData = await extractPageWiseText(pdfFile.buffer);
    const totalPages = pdfData.totalPages;
    if(totalPages > 100)
    {
        throw new ApiError(400,'More than 100 pages pdf cannot be uploaded');
    }
    const pdfText = pdfData.text;

    const filePath = `public/${pdfFile.originalname}`
    const { data, error } = await supabase
    .storage
    .from(`${process.env.SUPABASE_PROJECT_BUCKET}`)
    .upload(filePath, pdfFile.buffer, {
        cacheControl: '3600',
        upsert: false
    })

    if(error)
    {
        console.error(error.message)
        throw new ApiError(500,error.message)
    }

    const fileName = pdfFile.originalname;
    const file_upload_path = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${process.env.SUPABASE_PROJECT_BUCKET}/${data.path}`

    //to add langauage detection function otherwise done

    try {
            const newPdf = await PDF.create({
                userId:req.user,
                fileName,
                filePath:file_upload_path,
                language:'',//to add text langauge in it
                text:pdfData.pagesText,
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

