import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const cacheKey = `bluechip-analysis:${todayKey()}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "No Gemini key" }, { status: 500 });
  }

  const { stockSummaries } = await request.json();
  if (!stockSummaries) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const prompt = `You are Adam Khoo's analyst using his 7-Step Formula. Analyze these blue chip stocks.

Steps: 1) Consistent growth 5yr+ 2) Growth >10%/yr 3) Moat (undisruptable 10-20yrs) 4) ROE >15% 5) Debt <3x income 6) Below DCF value (PEG<1=cheap) 7) Entry at SMA support.

${stockSummaries}

Return JSON, each key = ticker:
{"AAPL":{"action":"BUY","technicalScore":70,"fundamentalScore":90,"moatScore":5,"targetUpside":30,"intrinsicValue":300,"buyAtPrice":240,"analysis":"Brief one-line"}}

All 10 tickers. Return ONLY valid JSON.`;

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
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Gemini failed" }, { status: 502 });

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) {
      if (part.text && !part.thought) text += part.text;
    }
    if (!text) return NextResponse.json({ error: "Empty" }, { status: 502 });

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      if (start === -1) return NextResponse.json({ error: "Parse failed" }, { status: 502 });
      let depth = 0, end = start;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        if (depth === 0) { end = i + 1; break; }
      }
      result = JSON.parse(text.slice(start, end));
    }
    await setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
