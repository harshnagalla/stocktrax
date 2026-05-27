import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, validateSymbol } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";
import { callAI } from "@/lib/ai";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const tickers = [...new Set(symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(validateSymbol))]
    .slice(0, 20);

  if (tickers.length === 0) {
    return NextResponse.json({ error: "symbols param required" }, { status: 400 });
  }

  const cacheKey = `portfolio-analysis:${todayKey()}:${tickers.join(",")}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "AI Gateway API key not configured" }, { status: 500 });
  }

  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  let portfolioData: Record<string, Record<string, unknown>> = {};
  try {
    const res = await fetch(`${origin}/api/quotes?symbols=${tickers.join(",")}&analyze=true`);
    portfolioData = await res.json();
  } catch { /* continue */ }

  const stockSummaries = tickers.map((t) => {
    const d = portfolioData[t] as Record<string, unknown> | undefined;
    if (!d) return `${t}: no data`;
    return `${t}(${d.name}): $${d.price}, ${d.changePercent}%, 52W $${d.fiftyTwoWeekLow}-$${d.fiftyTwoWeekHigh}, MA5 $${d.ma5}, MA10 $${d.ma10}, MA20 $${d.ma20}, 50SMA $${d.sma50}, 150SMA $${d.sma150}, 200SMA $${d.sma200}, RSI ${d.rsi}, deterministicSignal ${d.signal}`;
  }).join("\n");

  const prompt = `You are Adam Khoo's investment analyst using his exact 7-Step Formula.

Steps: 1) Consistent revenue/earnings/cash flow growth 5yr+ 2) Growth >10%/yr 3) Economic moat (gross margin >25%, undisruptable 10-20yrs) 4) ROE >15% 5) Debt <3x net income 6) Price below DCF fair value (PEG<1 = cheap) 7) Entry at SMA support dip.
Key: Distinguish SENTIMENT drops (buy) from STRUCTURAL decline (avoid). 10-year horizon.

${stockSummaries}

Return ONLY valid JSON object, each key = ticker:
{
  "MSFT": {
    "action": "BUY" or "HOLD" or "SELL",
    "technicalScore": 0-100,
    "fundamentalScore": 0-100,
    "moatScore": 1-5,
    "targetUpside": number,
    "intrinsicValue": number or null,
    "buyAtPrice": number or null,
    "analysis": "One line: RSI X (status). Near/Far from 52W lows. Above/Below key SMA. Moat assessment."
  }
}

technicalScore: 90+ = strong uptrend + oversold RSI, 70-89 = uptrend, 50-69 = neutral, 30-49 = weak, <30 = downtrend.
fundamentalScore: 90+ = wide moat + undervalued, 70-89 = strong business, 50-69 = decent, <50 = weak/risky.

Return ONLY valid JSON for all tickers provided above.`;

  try {
    const text = await callAI(prompt, { temperature: 0.3, maxOutputTokens: 16384 });

    try {
      const result = JSON.parse(text);
      await setCache(cacheKey, result);
      return NextResponse.json(result);
    } catch {
      const start = text.indexOf("{");
      if (start === -1) return NextResponse.json({ error: "Parse failed" }, { status: 502 });
      let depth = 0, end = start;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        if (depth === 0) { end = i + 1; break; }
      }
      const result = JSON.parse(text.slice(start, end));
      await setCache(cacheKey, result);
      return NextResponse.json(result);
    }
  } catch (err) {
    console.error("Portfolio analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
