import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const deepseek = createOpenAICompatible({
  name: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

export const TEXT_MODEL = "deepseek-v4-pro";
export const VISION_MODEL = "gemini-2.5-flash";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const match = imageUrl.match(/^data:([^;,]+);base64,(.+)$/);
  const mimeType = match?.[1] ?? "image/png";
  const base64Data = match?.[2] ?? imageUrl;
  const model = options.model ?? VISION_MODEL;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.1,
        maxOutputTokens: options.maxOutputTokens ?? 2000,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini vision request failed: ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini vision returned no text");
  }

  return text;
}
