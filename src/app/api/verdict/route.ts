import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, validateSymbol } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";
import { callAI } from "@/lib/ai";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol || !validateSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "AI Gateway API key not configured" }, { status: 500 });
  }

  const refresh = request.nextUrl.searchParams.get("refresh") === "true";
  const cacheKey = `verdict:${symbol}:${todayKey()}`;
  if (!refresh) {
    const cached = await getCached(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

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

Return ONLY valid JSON, no markdown:
{"action":"BUY","confidence":8,"oneLiner":"short","verdict":"short","strategy":"what to do, how much, when","entryPoint":"349","entryReason":"short","bullPoint":"short","bearPoint":"short","moat":"WIDE","moatWhy":"short","risk":"LOW","topRisk":"short","intrinsicValue":500,"buyAt":349,"stopLoss":320,"technicalScore":70,"fundamentalScore":85}

Rules: Use current price/SMAs for recommendation. Transitioning trend=don't say BUY. Be specific with entry/stop prices.`;

  try {
    const text = await callAI(prompt, { temperature: 0.3, maxOutputTokens: 4000 });
    const result = { symbol, ...JSON.parse(text) };
    await setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Verdict failed:", err);
    return NextResponse.json({ error: "Verdict failed" }, { status: 500 });
  }
}
