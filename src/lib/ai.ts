import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

export const TEXT_MODEL = "deepseek-chat";
export const VISION_MODEL = "deepseek-chat";

interface CallOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  system?: string;
}

export async function callAI(prompt: string, options: CallOptions = {}): Promise<string> {
  const { text } = await generateText({
    model: deepseek.chat(options.model ?? TEXT_MODEL),
    system: options.system,
    prompt,
    temperature: options.temperature ?? 0.3,
    maxOutputTokens: options.maxOutputTokens ?? 8192,
  });
  return text;
}

export async function callAIVision(
  prompt: string,
  imageUrl: string,
  options: Omit<CallOptions, "system"> = {}
): Promise<string> {
  const { text } = await generateText({
    model: deepseek.chat(options.model ?? VISION_MODEL),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image: imageUrl },
          { type: "text", text: prompt },
        ],
      },
    ],
    temperature: options.temperature ?? 0.1,
    maxOutputTokens: options.maxOutputTokens ?? 2000,
  });
  return text;
}
