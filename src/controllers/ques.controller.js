import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { PDF } from "../models/pdf.model.js";
import { Question } from "../models/question.model.js";
import {ai,client} from '../utils/geminiQdrant.js'

const question = asyncHandler(async(req,res)=>{
    const {question,sessionId,title} = req.body;
    if(!question || !sessionId || !title)
    {
        throw new ApiError(400,'No Question or Session ID or Title Found');
    }

    try {
        const newQuestion = await Question.create({userId:req?.user,sessionId,questionText:question,title});
        if(!newQuestion)
        {
            throw new ApiError(500,'Question was not been able to uploaded')
        }
        return res.status(200).json(new ApiResponse(200,'Question created Successfully'),{...newQuestion});
    } catch (error) {
        console.error(error.message)
        throw new ApiError(500,'Internal Server Error Occured')
    }
})

const answer = asyncHandler(async (req,res)=> {
    const {questionId,sessionId,pdfIds,title} = req.body;
    if(!questionId || !sessionId || !title)
    {
        throw new ApiError(400,'No Question or Session ID or Title Found');
    }

    if(!Array.isArray(pdfIds) || pdfIds.length === 0)
    {
        throw new ApiError(400,'Select the sources to get the answer from')
    }
     
    const question = await Question.findById(questionId);
    if(!question)
    {
        throw new ApiError(403,'No Question Exsists');
    }
    
    const questionEmbedding = await ai.models.embedContent({
        model:'gemini-embedding-001',
        contents:[question.questionText]
    })

    const searchResult = await client.search({
        collection_name:'pdf_pages',
        vector: questionEmbedding.embeddings[0].values,
        filter:{
            must:[
                {key:'pdfId',match:{any:pdfIds}}
            ]
        },
        limit:5
    })

    const matchedPages = searchResult.map(point=>({
        pdfId:point.payload.pdfId,
        pageNumber:point.payload.pageNumber
    }))

    const texts = [];
    for(const mp of matchedPages)
    {
        const pdf = await PDF.findById(mp.pdfId);
        if(pdf)
        {
            const page = pdf.text.find(p=>p.pageNumber === mp.pageNumber)
            if(page) texts.push(page.content);
        }
    }

    const answerResponse = await ai.models.chat.completions.create({
        model:'gemini-chat-001',
        messages:[
            {role:'system',content:'You are a helpful assistant'},
            {role:'user',content:`Answer this question based on the context:\nQuestion: ${question.questionText}\nContext: ${texts.join('\n\n')}`}
        ]
    })

    if(!answerResponse)
    {
        throw new ApiError(500,'Error Getting Response');
    }

    const answerText = answerResponse.choices[0].message.content;

    const answer = await Text.create({
        userId:req.user,
        questionId:questionId,
        sources:matchedPages,
        translatedText: '',//to add a translator 
        answerText,
        sessionId,
        title:title
    })

    return res.status(200).json(new ApiResponse(200,'Answeres Successfully'),{...answer})
})

export {question,answer}