import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_CONTEXT = `You are an investment analyst who follows Adam Khoo's Value Momentum Investing methodology.

Adam Khoo's key principles:
1. MOAT: Companies with strong competitive advantage that cannot be disrupted for 10-20 years. High switching costs, network effects, brand monopoly. Operating margin > 25% = wide moat.
2. VALUATION: PEG < 1 = undervalued. Use DCF to estimate intrinsic value.
3. SENTIMENT vs STRUCTURAL: Sentiment drops (war, macro, lawsuits, capex) = buying opportunities. Structural decline (losing competitive advantage) = avoid.
4. DEBT: Long-term debt < 3x net income.
5. GROWTH: Revenue AND earnings growing 5+ years. ROE > 15%, ROIC > 12%.
6. MOMENTUM: 50 SMA > 150 SMA, both sloping up. Buy pullbacks to 50 SMA.
7. 10-YEAR HORIZON: Will this company be stronger in 10 years?

Current market (March 2026): S&P down ~9%, Nasdaq down ~12%. PEG at 1.07 (30yr low). Tech selling off due to AI capex fears — sentiment, not structural. Overvalued: WMT, KO, PEP, COST.`;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol param required" }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  // Fetch technical data
  const origin = request.nextUrl.origin;
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

Give a concise Adam Khoo analysis of ${symbol}. Return ONLY valid JSON:
{"action":"BUY/HOLD/SELL/WATCH","confidence":"HIGH/MEDIUM/LOW","moat":"1-2 sentences on competitive advantage","dropReason":"SENTIMENT/STRUCTURAL/NONE","dropExplanation":"1-2 sentences why price dropped","intrinsicValue":number_or_null,"buyAtPrice":number_or_null,"summary":"2-3 sentences plain English what to do and why"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8000,
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

    // Gemini 3.1 Pro may return multiple parts (thinking + response)
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    let text = "";
    for (const part of parts) {
      if (part.text) text += part.text;
    }

    if (!text) {
      console.error("Gemini empty:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    // Extract JSON — find the outermost { } that contains "action"
    let jsonStr = "";
    const start = text.indexOf("{");
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        if (depth === 0) {
          jsonStr = text.slice(start, i + 1);
          break;
        }
      }
    }
    if (!jsonStr || !jsonStr.includes('"action"')) {
      console.error("No JSON in Gemini response:", text.slice(0, 500));
      return NextResponse.json({ error: "Could not parse analysis" }, { status: 502 });
    }
    const analysis = JSON.parse(jsonStr);

    return NextResponse.json({ symbol, ...analysis });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed — try again" }, { status: 500 });
  }
}
