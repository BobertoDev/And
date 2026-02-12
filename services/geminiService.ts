import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateBotResponse = async (
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "I cannot connect to my brain right now. Please check the API Key.";

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history,
      config: {
        systemInstruction: "You are a helpful AI assistant integrated into a Discord-like chat application. Your name is Gemini. Keep responses concise and formatted using Markdown if necessary. You are friendly and cool.",
      }
    });

    const result = await chat.sendMessage({ message: prompt });
    return result.text || "I didn't have anything to say.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};
