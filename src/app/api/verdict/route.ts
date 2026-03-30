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

  const prompt = `You are two analysts debating about ${symbol}, then reaching a final verdict.

ANALYST 1 (Bull): Uses Adam Khoo's 7-Step Formula. Looks for: moat, consistent growth, ROE>15%, debt<3x income, PEG<1, price near SMA support. 10-year horizon.

ANALYST 2 (Bear/Critic): Challenges everything. Finds real risks, questions the moat, looks for structural problems, considers competition and disruption.

MODERATOR: Weighs both sides using technical data and historical patterns. Gives ONE clear verdict.

CURRENT LIVE DATA (use this for your analysis, not your training data):
${techData || "No data available."}

IMPORTANT: Base your recommendation on the CURRENT price and SMA levels shown above. If price is above 200 SMA but 50 SMA is crossing below 150 SMA, the trend is TRANSITIONING — don't recommend BUY in a transitioning trend. If RSI < 30, note it's oversold but wait for trend confirmation.

Have the debate internally, then return ONE unified verdict. Return JSON:
{
  "action": "BUY/HOLD/SELL/AVOID",
  "confidence": 1-10,
  "oneLiner": "One sentence: what to do and why (plain English, no jargon)",
  "verdict": "2-3 sentences: the balanced conclusion after bull vs bear debate",
  "bullPoint": "Strongest bull argument in one sentence",
  "bearPoint": "Strongest bear argument in one sentence",
  "moat": "WIDE/NARROW/NONE",
  "moatWhy": "One sentence why",
  "risk": "LOW/MEDIUM/HIGH",
  "topRisk": "Biggest single risk in one sentence",
  "intrinsicValue": number_or_null,
  "buyAt": number_or_null,
  "stopLoss": number_or_null,
  "technicalScore": 0-100,
  "fundamentalScore": 0-100
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2000, responseMimeType: "application/json" },
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
