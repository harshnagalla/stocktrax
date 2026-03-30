import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Critic Agent — challenges every analysis, finds flaws, asks hard questions
// The analysis API gives the bull case. The critic gives the bear case.
// Together they create a balanced view.

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const analysisJson = request.nextUrl.searchParams.get("analysis");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "No Gemini key" }, { status: 500 });
  }

  const cacheKey = `critic:${symbol}:${todayKey()}`;
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Get the original analysis to critique
  let analysisContext = "";
  if (analysisJson) {
    try {
      const analysis = JSON.parse(analysisJson);
      analysisContext = `The bull case analysis says: Action=${analysis.action}, Moat="${analysis.moatReason}", Drop="${analysis.dropExplanation}", Intrinsic Value=$${analysis.intrinsicValue}, Summary="${analysis.summary}"`;
    } catch { /* skip */ }
  }

  // Also fetch technical data
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  let techContext = "";
  try {
    const res = await fetch(`${origin}/api/quotes?symbols=${symbol}&analyze=true`);
    const quotes = await res.json();
    const q = quotes[symbol];
    if (q) {
      techContext = `Price $${q.price}, 50SMA $${q.sma50}, 150SMA $${q.sma150}, 200SMA $${q.sma200}, RSI ${q.rsi}`;
    }
  } catch { /* continue */ }

  const prompt = `You are a BEAR CASE CRITIC — a skeptical analyst whose job is to find every possible flaw, risk, and red flag in a stock investment thesis.

You are critiquing the bull case for ${symbol}.
${analysisContext}
${techContext ? `Technical data: ${techContext}` : ""}

Your job:
1. Find REAL risks and flaws (not generic ones — specific to THIS company)
2. Challenge the moat — what could disrupt it?
3. Challenge the valuation — what if growth slows?
4. Find the bear case — what could go wrong in 1-3 years?
5. Identify red flags in the technicals
6. Give a contrarian view — what would make you NOT buy this stock?

Be specific, not generic. Reference actual competitors, market dynamics, and trends.

Return JSON:
{
  "overallRisk": "LOW/MEDIUM/HIGH",
  "bearCase": "2-3 sentences: the strongest argument AGAINST buying this stock right now",
  "risks": [
    {"title": "Risk name", "severity": "HIGH/MEDIUM/LOW", "explanation": "Specific explanation"},
    {"title": "Risk name", "severity": "HIGH/MEDIUM/LOW", "explanation": "Specific explanation"},
    {"title": "Risk name", "severity": "HIGH/MEDIUM/LOW", "explanation": "Specific explanation"}
  ],
  "moatChallenge": "How could the moat be disrupted? Be specific about competitors or technology shifts",
  "valuationRisk": "What if the bull case valuation is wrong? What's the downside scenario?",
  "technicalWarning": "What do the technicals actually suggest? Any divergences or warning signs?",
  "worstCase": "If everything goes wrong, what's the stock worth? Give a bear case price target",
  "verdict": "After considering all risks: STILL BUY / WAIT / TOO RISKY"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5, // slightly higher temp for more creative criticism
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) return NextResponse.json({ error: "Gemini failed" }, { status: 502 });

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) { if (part.text && !part.thought) text += part.text; }
    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 502 });

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

    const final = { symbol, ...result };
    await setCache(cacheKey, final);
    return NextResponse.json(final);
  } catch (err) {
    console.error("Critic failed:", err);
    return NextResponse.json({ error: "Critic analysis failed" }, { status: 500 });
  }
}
