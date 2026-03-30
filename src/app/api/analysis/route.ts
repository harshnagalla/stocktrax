import { NextRequest, NextResponse } from "next/server";
import { validateSymbol, checkRateLimit } from "@/lib/api-utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Adam Khoo's EXACT 7-Step Investment Formula (verified from his courses + videos)
const SYSTEM_CONTEXT = `You are an investment analyst who follows Adam Khoo's 7-Step Investment Formula exactly.

STEP 1 — CONSISTENT GROWTH: Revenue, net income, AND operating cash flow must be increasing for 5+ years. Sales growth > 10%/yr. "Earnings can be manipulated, sales cannot."

STEP 2 — POSITIVE GROWTH RATE: Profit growth > 10% per annum over 5 years minimum.

STEP 3 — ECONOMIC MOAT (Sustainable Competitive Advantage): Gross margin > 25% maintained for 5-10 years = strong moat. Operating margin > 25% = wide moat. Look for: high switching costs, network effects, brand monopoly, pricing power. The moat must make the company undisruptable for 10-20 years.

STEP 4 — HIGH ROE: ROE > 12% = fair, ROE > 15% = excellent. Must be consistent, not one-off.

STEP 5 — CONSERVATIVE DEBT: Long-term debt < 3x current net income (after tax). Debt should be payable in 3-4 years. Exception: does NOT apply to banks/financials.

STEP 6 — PRICE BELOW FAIR VALUE: Primary method: DCF (discounted cash flow from operations, 10-year projection, discount rate based on beta: beta 1.0 = 6.8%, beta 1.5 = 9%). Secondary: PEG ratio. PEG < 1 = undervalued, PEG = 1 = fair, PEG > 1 = overvalued.

STEP 7 — GREAT ENTRY POINT: Buy at a dip in an uptrend. Moving averages: 50 SMA > 150 SMA (PRIMARY trend signal, NOT 50/200 golden cross). Both must slope up. Buy pullbacks to 20 EMA or 50 SMA support. Uptrend confirmed when 20 EMA > 40 EMA AND 50 SMA > 150 SMA.

CRITICAL DISTINCTION — When a stock drops, ask: SENTIMENT or STRUCTURAL?
- Sentiment drops (war, interest rates, lawsuits, AI capex fears) = buying opportunity. The bus turns back to pick up passengers.
- Structural decline (losing competitive advantage, revenue falling long-term) = AVOID no matter how cheap.

Current market (March 2026): S&P down ~9%, Nasdaq down ~12%. PEG at 1.07 (lowest in 30 years). Tech selling off due to AI capex fears — this is SENTIMENT, not structural. Defensive stocks (WMT, KO, PEP, COST) are OVERVALUED — bid up as safe havens.`;

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
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  // Fetch technical data
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  let priceContext = `Analyze ${symbol}.`;
  try {
    const quoteRes = await fetch(`${origin}/api/quotes?symbols=${symbol}&analyze=true`);
    const quotes = await quoteRes.json();
    const q = quotes[symbol];
    if (q) {
      priceContext = `Data for ${symbol} (${q.name}): Price $${q.price}, Change ${q.changePercent}%, 52W $${q.fiftyTwoWeekLow}-$${q.fiftyTwoWeekHigh}, 50SMA $${q.sma50}, 150SMA $${q.sma150}, 200SMA $${q.sma200}, RSI ${q.rsi}, Signal: ${q.signal}`;
    }
  } catch { /* continue without data */ }

  const prompt = `${SYSTEM_CONTEXT}

${priceContext}

Analyze ${symbol}. Return JSON:
{"action":"BUY/HOLD/SELL/WATCH","confidence":"HIGH/MEDIUM/LOW","summary":"2-3 sentences: what to do and why, plain English","moatType":"WIDE/NARROW/NONE","moatReason":"Why this company has a moat - specific competitive advantages (switching costs, network effects, brand, patents, etc)","moatDuration":"How many years this moat is likely to last","dropReason":"SENTIMENT/STRUCTURAL/NONE","dropExplanation":"Why the price dropped and whether it matters long-term","intrinsicValue":number_or_null,"buyAtPrice":number_or_null,"shortTermSupport":number_or_null,"longTermSupport":number_or_null,"technicalScore":0-100,"fundamentalScore":0-100,"moatScore":1-5,"targetUpside":percentage_number}`;

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

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", res.status, err.slice(0, 200));
      return NextResponse.json({ error: "Gemini API failed" }, { status: 502 });
    }

    const data = await res.json();

    // Extract text from all parts (skip thinking parts)
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) {
      if (part.text && !part.thought) text += part.text;
    }

    if (!text) {
      console.error("Gemini empty:", JSON.stringify(data).slice(0, 300));
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    // With responseMimeType, text should be clean JSON. Try direct parse first.
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      // Fallback: extract JSON via brace matching
      const start = text.indexOf("{");
      if (start === -1) {
        console.error("No JSON found:", text.slice(0, 300));
        return NextResponse.json({ error: "Could not parse" }, { status: 502 });
      }
      let depth = 0;
      let end = start;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        if (depth === 0) { end = i + 1; break; }
      }
      analysis = JSON.parse(text.slice(start, end));
    }

    return NextResponse.json({ symbol, ...analysis });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed — try again" }, { status: 500 });
  }
}
