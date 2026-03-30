import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";

// Parse portfolio screenshot using Gemini 2.0 Flash (cheapest vision model)
// POST /api/parse-portfolio with { image: base64 }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "No Gemini key" }, { status: 500 });
  }

  const { image } = await request.json();
  if (!image) {
    return NextResponse.json({ error: "image (base64) required" }, { status: 400 });
  }

  // Remove data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data,
                },
              },
              {
                text: `Extract all stock holdings from this portfolio screenshot. Return ONLY valid JSON array:
[{"ticker":"AAPL","shares":100,"avgCost":150.50,"account":"Broker Name"},...]

Rules:
- ticker: US stock symbol (uppercase)
- shares: number of shares
- avgCost: average cost per share
- account: broker/account name if visible, else "Default"
- Include ALL stocks visible in the screenshot
- If avg cost is not visible, use 0
- Return ONLY the JSON array, nothing else`,
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Gemini vision failed" }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    const holdings = JSON.parse(text);
    return NextResponse.json({ holdings });
  } catch (err) {
    console.error("Parse portfolio failed:", err);
    return NextResponse.json({ error: "Failed to parse screenshot" }, { status: 500 });
  }
}
