import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// For backwards compatibility, export a proxy that only initializes when accessed
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
};