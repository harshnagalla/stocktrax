import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { callAIVision } from "@/lib/ai";

// POST /api/parse-portfolio with { image: base64 }

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "AI Gateway API key not configured" }, { status: 500 });
  }

  const { image } = await request.json();
  if (!image) {
    return NextResponse.json({ error: "image (base64) required" }, { status: 400 });
  }

  // Keep full data URL so callAIVision gets correct MIME type
  const imageUrl = image.startsWith("data:") ? image : `data:image/png;base64,${image}`;

  try {
    const text = await callAIVision(
      `Extract all stock holdings from this portfolio screenshot. Return ONLY valid JSON array:
[{"ticker":"AAPL","shares":100,"avgCost":150.50,"account":"Broker Name"},...]

Rules:
- ticker: US stock symbol (uppercase)
- shares: number of shares
- avgCost: average cost per share
- account: broker/account name if visible, else "Default"
- Include ALL stocks visible in the screenshot
- If avg cost is not visible, use 0
- Return ONLY the JSON array, nothing else`,
      imageUrl,
      { temperature: 0.1, maxOutputTokens: 2000 }
    );

    const holdings = JSON.parse(text);
    return NextResponse.json({ holdings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Parse portfolio failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
