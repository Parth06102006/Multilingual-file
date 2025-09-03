import { GoogleGenAI } from "@google/genai";
import {QdrantClient} from '@qdrant/js-client-rest';

const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY})
const client = new QdrantClient({
    url:process.env.QDRANT_URL,
    apiKey:process.env.QDRANT_API_KEY
})

export  {client,ai};