import { GoogleGenAI } from "@google/genai";
import { ApiError } from "./ApiError.js";

export const detectLanguage = async(text)=>{
    const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY_2});
    try {
        const response = await ai.models.generateContent({
            model:'gemini-2.5-flash',
            contents:`Give me which language is this : ${text}`,
            config:{
                thinkingConfig:{
                    thinkingBudget:0
                }
            }
        })
        return response.text;
    } catch (error) {
        console.error(error.message)
        throw new ApiError(500,'Unable to detect Language')
    }
}