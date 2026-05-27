import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { callAIVision } from "@/lib/ai";

// POST /api/parse-portfolio with { image: base64 }

interface ParsedHolding {
  ticker: string;
  shares: number;
  avgCost: number;
  account: string;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractJSONArray(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch { /* try fallback */ }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch { /* try bracket matching */ }
  }

  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in AI response");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "[") depth++;
    if (char === "]") depth--;

    if (depth === 0) {
      return JSON.parse(text.slice(start, i + 1));
    }
  }

  throw new Error("Incomplete JSON array in AI response");
}

function normalizeHoldings(value: unknown): ParsedHolding[] {
  if (!Array.isArray(value)) {
    throw new Error("AI response was not a JSON array");
  }

  return value
    .map((item): ParsedHolding | null => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;
      const ticker = typeof row.ticker === "string" ? row.ticker.trim().toUpperCase() : "";
      if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) return null;

      return {
        ticker,
        shares: parseNumber(row.shares),
        avgCost: parseNumber(row.avgCost),
        account: typeof row.account === "string" && row.account.trim() ? row.account.trim() : "Default",
      };
    })
    .filter((holding): holding is ParsedHolding => holding !== null && holding.shares > 0);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
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

    const holdings = normalizeHoldings(extractJSONArray(text));
    return NextResponse.json({ holdings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Parse portfolio failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
