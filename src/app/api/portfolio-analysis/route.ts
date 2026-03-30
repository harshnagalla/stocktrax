import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PORTFOLIO_TICKERS = [
  "ALM", "DOCU", "LULU", "MSFT", "QQQ", "SNAP", "UNH", "VOO", "VTWO", "XLV",
  "NNDM", "CWEB", "ISRG", "ATEC", "NKE", "SHOP", "IBIT", "AMZN", "AMD", "GOOGL",
];

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "No Gemini key" }, { status: 500 });
  }

  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  let portfolioData: Record<string, Record<string, unknown>> = {};
  try {
    const res = await fetch(`${origin}/api/portfolio`);
    portfolioData = await res.json();
  } catch { /* continue */ }

  const stockSummaries = PORTFOLIO_TICKERS.map((t) => {
    const d = portfolioData[t] as Record<string, unknown> | undefined;
    if (!d) return `${t}: no data`;
    return `${t}(${d.name}): $${d.price}, ${d.changePercent}%, 52W $${d.fiftyTwoWeekLow}-$${d.fiftyTwoWeekHigh}, 50SMA $${d.sma50}, 150SMA $${d.sma150}, 200SMA $${d.sma200}, RSI ${d.rsi}`;
  }).join("\n");

  const prompt = `You are Adam Khoo's investment analyst using his exact 7-Step Formula.

Steps: 1) Consistent revenue/earnings/cash flow growth 5yr+ 2) Growth >10%/yr 3) Economic moat (gross margin >25%, undisruptable 10-20yrs) 4) ROE >15% 5) Debt <3x net income 6) Price below DCF fair value (PEG<1 = cheap) 7) Entry at SMA support dip.
Key: Distinguish SENTIMENT drops (buy) from STRUCTURAL decline (avoid). 10-year horizon.

${stockSummaries}

Return JSON object, each key = ticker:
{
  "MSFT": {
    "action": "BUY" or "HOLD" or "SELL",
    "technicalScore": 0-100 (based on SMA alignment, RSI, trend strength),
    "fundamentalScore": 0-100 (based on moat, growth, competitive position),
    "moatScore": 1-5,
    "targetUpside": percentage number (e.g. 59 means +59% upside to intrinsic value),
    "intrinsicValue": number or null,
    "buyAtPrice": number or null,
    "analysis": "One line: RSI X (status). Near/Far from 52W lows. Above/Below key SMA. Moat assessment."
  }
}

technicalScore guide: 90+ = strong uptrend + oversold RSI, 70-89 = uptrend, 50-69 = neutral, 30-49 = weak, <30 = downtrend.
fundamentalScore guide: 90+ = wide moat + undervalued, 70-89 = strong business, 50-69 = decent, <50 = weak/risky.

Return ONLY valid JSON for all 20 tickers.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini batch error:", res.status);
      return NextResponse.json({ error: "Gemini failed" }, { status: 502 });
    }

    const data = await res.json();
    // Extract text from non-thinking parts
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) {
      if (part.text && !part.thought) text += part.text;
    }
    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 502 });

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      // Fallback brace extraction
      const start = text.indexOf("{");
      if (start === -1) return NextResponse.json({ error: "Parse failed" }, { status: 502 });
      let depth = 0, end = start;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        if (depth === 0) { end = i + 1; break; }
      }
      return NextResponse.json(JSON.parse(text.slice(start, end)));
    }
  } catch (err) {
    console.error("Portfolio analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
