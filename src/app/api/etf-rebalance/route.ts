import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "No Gemini key" }, { status: 500 });
  }

  const body = await request.json();
  const { etfs, overlaps, matrix, holdings, totalValue } = body as {
    etfs: { symbol: string; name: string; holdings: { symbol: string; holdingName: string; holdingPercent: number }[] }[];
    overlaps: { etf1: string; etf2: string; sharedCount: number; overlapPercent: number; sharedHoldings: { symbol: string; pct1: number; pct2: number }[] }[];
    matrix: Record<string, Record<string, number>>;
    holdings: { ticker: string; shares: number; marketValue: number; currentPct: number }[];
    totalValue: number;
  };

  // Build a cache key from the date (AI recommendation once per day)
  const cacheKey = `etf-rebalance:${todayKey()}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Format data for the prompt
  const holdingsSummary = holdings
    .map((h) => `${h.ticker}: ${h.shares} shares, $${h.marketValue.toFixed(0)} (${h.currentPct.toFixed(1)}% of ETF portfolio)`)
    .join("\n");

  const overlapSummary = overlaps
    .map((o) => {
      const topShared = o.sharedHoldings.slice(0, 5).map((s) =>
        `${s.symbol} (${s.pct1.toFixed(1)}% in ${o.etf1}, ${s.pct2.toFixed(1)}% in ${o.etf2})`
      ).join(", ");
      return `${o.etf1} <-> ${o.etf2}: ${o.sharedCount} shared companies, ${o.overlapPercent.toFixed(1)}% overlap weight. Top shared: ${topShared}`;
    })
    .join("\n");

  const matrixStr = Object.entries(matrix)
    .map(([etf, row]) => `${etf}: ${Object.entries(row).map(([k, v]) => `${k}=${v}`).join(", ")}`)
    .join("\n");

  const etfDescriptions = etfs
    .map((e) => `${e.symbol} (${e.name}): Top holdings - ${e.holdings.slice(0, 5).map((h) => `${h.symbol} ${h.holdingPercent.toFixed(1)}%`).join(", ")}`)
    .join("\n");

  const prompt = `You are a portfolio strategist analyzing an ETF portfolio for rebalancing. Focus on OVERLAP between ETFs and diversification.

## Current ETF Holdings
Total ETF portfolio value: $${totalValue.toFixed(0)}
${holdingsSummary}

## ETF Descriptions & Top Holdings
${etfDescriptions}

## Overlap Matrix (shared company count between each pair)
${matrixStr}

## Detailed Overlaps
${overlapSummary}

## Task
Analyze the overlap between these ETFs and recommend rebalancing. Consider:
1. Which ETFs overlap the most and whether the investor is over-exposed to certain companies
2. Whether reducing one ETF could reduce redundancy without losing exposure
3. Sector/geographic diversification
4. Risk balance (broad market vs sector vs speculative)

Return JSON:
{
  "summary": "2-3 sentence overview of the portfolio's overlap problem and diversification status",
  "overlapInsight": "Explain the biggest overlap issues in plain English — which companies are held multiple times and how much effective exposure that creates",
  "recommendations": [
    {
      "ticker": "VOO",
      "action": "HOLD" | "INCREASE" | "REDUCE" | "SELL",
      "targetPct": 35,
      "reasoning": "1-2 sentence explanation"
    }
  ],
  "swapSuggestions": [
    {
      "sell": "QQQ",
      "buyInstead": "VGT or SCHD",
      "reason": "Why this swap reduces overlap or improves diversification"
    }
  ]
}

Return ONLY valid JSON. Include all 6 ETFs in recommendations. Be specific about overlap concerns.`;

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
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini rebalance error:", res.status);
      return NextResponse.json({ error: "Gemini failed" }, { status: 502 });
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) {
      if (part.text && !part.thought) text += part.text;
    }
    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 502 });

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
    console.error("ETF rebalance analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
