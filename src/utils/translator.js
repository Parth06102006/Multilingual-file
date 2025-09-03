import { GoogleGenAI } from "@google/genai";
import { ApiError } from "./ApiError";

export const translateLanguage = async (text, pageNumber) => {
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
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            pageNumber: {
              type: "integer",
              description: "Page number in the PDF"
            },
            content: {
              type: "string",
              description: "Translated English text content of this page"
            }
          },
          required: ["pageNumber", "content"]
        }
      }
    });

    const output = JSON.parse(result.response.text());
    console.log(output);
    return output;
  } catch (error) {
    console.error("Gemini Translation Error:", error.message);
    throw new ApiError(500,'Unable to Translate the PDF');
  }
};