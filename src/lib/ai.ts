import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const deepseek = createOpenAICompatible({
  name: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

export const TEXT_MODEL = "deepseek-v4-pro";
export const VISION_MODEL = "deepseek-v4-pro";

interface CallOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  system?: string;
}

export async function callAI(prompt: string, options: CallOptions = {}): Promise<string> {
  const { text } = await generateText({
    model: deepseek.chatModel(options.model ?? TEXT_MODEL),
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
    model: deepseek.chatModel(options.model ?? VISION_MODEL),
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
