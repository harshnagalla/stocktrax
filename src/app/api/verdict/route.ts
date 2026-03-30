import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, validateSymbol } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Unified verdict: Bull + Bear debate → One clear conclusion
// Single Gemini call that plays both sides and resolves

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol || !validateSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "No Gemini key" }, { status: 500 });
  }

  const refresh = request.nextUrl.searchParams.get("refresh") === "true";
  const cacheKey = `verdict:${symbol}:${todayKey()}`;
  if (!refresh) {
    const cached = await getCached(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  // Fetch technical data
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  let techData = "";
  try {
    const res = await fetch(`${origin}/api/quotes?symbols=${symbol}&analyze=true`);
    const quotes = await res.json();
    const q = quotes[symbol];
    if (q) {
      techData = `${symbol} (${q.name}): Price $${q.price}, Change ${q.changePercent}%, 52W $${q.fiftyTwoWeekLow}-$${q.fiftyTwoWeekHigh}, 50SMA $${q.sma50}, 150SMA $${q.sma150}, 200SMA $${q.sma200}, RSI ${q.rsi}`;
    }
  } catch { /* continue */ }

  const prompt = `Bull vs Bear debate on ${symbol}. Use CURRENT data: ${techData || "unknown"}

Return JSON:
{"action":"BUY","confidence":8,"oneLiner":"short","verdict":"short","strategy":"what to do, how much, when","entryPoint":"349","entryReason":"short","bullPoint":"short","bearPoint":"short","moat":"WIDE","moatWhy":"short","risk":"LOW","topRisk":"short","intrinsicValue":500,"buyAt":349,"stopLoss":320,"technicalScore":70,"fundamentalScore":85}

Rules: Use current price/SMAs for recommendation. Transitioning trend=don't say BUY. Be specific with entry/stop prices.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4000, responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Gemini failed" }, { status: 502 });

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) { if (part.text && !part.thought) text += part.text; }
    if (!text) return NextResponse.json({ error: "Empty" }, { status: 502 });

    const result = { symbol, ...JSON.parse(text) };
    await setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Verdict failed:", err);
    return NextResponse.json({ error: "Verdict failed" }, { status: 500 });
  }
}
