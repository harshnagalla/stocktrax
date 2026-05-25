import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

const gateway = createGateway();

export const TEXT_MODEL = "deepseek/deepseek-v4-pro";
export const VISION_MODEL = "google/gemini-2.0-flash";

interface CallOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  system?: string;
}

const byok = {
  gateway: {
    byok: {
      deepseek: process.env.DEEPSEEK_API_KEY,
      google: process.env.GEMINI_API_KEY,
    },
  },
};

export async function callAI(prompt: string, options: CallOptions = {}): Promise<string> {
  const { text } = await generateText({
    model: gateway(options.model ?? TEXT_MODEL),
    system: options.system,
    prompt,
    temperature: options.temperature ?? 0.3,
    maxOutputTokens: options.maxOutputTokens ?? 8192,
    providerOptions: byok,
  });
  return text;
}

export async function callAIVision(
  prompt: string,
  imageUrl: string,  // full data URL (data:image/png;base64,...) or http URL
  options: Omit<CallOptions, "system"> = {}
): Promise<string> {
  const { text } = await generateText({
    model: gateway(options.model ?? VISION_MODEL),
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
    providerOptions: byok,
  });
  return text;
}
