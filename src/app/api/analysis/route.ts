import { NextRequest, NextResponse } from "next/server";

// Gemini-powered Adam Khoo analysis
// GET /api/analysis?symbol=MSFT
// Returns: moat assessment, intrinsic value estimate, sentiment vs structural, action

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Adam Khoo's methodology context — baked into the prompt
const SYSTEM_CONTEXT = `You are an investment analyst who follows Adam Khoo's Value Momentum Investing methodology exactly.

Adam Khoo's key principles:
1. MOAT ANALYSIS: Look for companies with strong competitive advantages — high switching costs, network effects, brand monopoly, pricing power. Operating margin > 25% = wide moat.
2. VALUATION: Use PEG ratio (PE / growth rate). PEG < 1 = undervalued. Also use discounted cash flow (DCF) to estimate intrinsic value.
3. SENTIMENT vs STRUCTURAL: When a stock drops, ask: is it sentiment (war, macro fears, lawsuits, capex spending) or structural (declining competitive advantage, revenue falling)? Sentiment drops = buying opportunities. Structural = avoid.
4. DEBT: Long-term debt should be < 3x net income. Conservative balance sheet is essential.
5. GROWTH: Revenue AND earnings growing consistently for 5+ years. ROE > 15%, ROIC > 12%.
6. MOMENTUM: 50 SMA should be above 150 SMA, both sloping up. Buy on pullbacks to 50 SMA support.
7. 10-YEAR HORIZON: Focus on companies that will be stronger in 10 years. Short-term volatility is noise.

Current market context (March 2026):
- S&P 500 down ~9% from highs, Nasdaq down ~12%
- PEG ratio at 1.07 — lowest in 30 years, suggesting tech is cheap
- Tech stocks selling off due to AI capex fears — Adam Khoo views this as sentiment-driven, not structural
- Overvalued sectors: Consumer Defensives (WMT, KO, PEP, COST) — bid up as "safe havens"
- Undervalued: Software, Cybersecurity, Payments, Healthcare

Adam Khoo's current high-conviction picks:
- MSFT: Intrinsic value $532, support at $349
- META: Intrinsic value $814, current ~$525
- GOOGL: Intrinsic value $294
- NOW: High switching costs, most resilient SaaS
- V, MA: Strongest payment companies, undervalued
- UNH: Cheaper due to regulatory fears = opportunity`;

interface QuoteData {
  price: number;
  changePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
  signal: string;
  name: string;
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol param required" }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  // First fetch the stock's technical data from our own quotes API
  const origin = request.nextUrl.origin;
  let quoteData: QuoteData | null = null;
  try {
    const quoteRes = await fetch(`${origin}/api/quotes?symbols=${symbol}&analyze=true`);
    const quotes = await quoteRes.json();
    quoteData = quotes[symbol] ?? null;
  } catch {
    // Continue without quote data
  }

  const priceContext = quoteData
    ? `Current data for ${symbol} (${quoteData.name}):
- Price: $${quoteData.price}
- Daily change: ${quoteData.changePercent}%
- 52-week range: $${quoteData.fiftyTwoWeekLow} - $${quoteData.fiftyTwoWeekHigh}
- 50 SMA: $${quoteData.sma50}, 150 SMA: $${quoteData.sma150}, 200 SMA: $${quoteData.sma200}
- RSI: ${quoteData.rsi}
- Technical signal: ${quoteData.signal}`
    : `Analyze ${symbol} based on your knowledge.`;

  const prompt = `${SYSTEM_CONTEXT}

${priceContext}

Give me a concise Adam Khoo-style analysis of ${symbol}. Be specific and actionable. Format your response EXACTLY as JSON with these fields:
{
  "action": "BUY" or "HOLD" or "SELL" or "WATCH",
  "confidence": "HIGH" or "MEDIUM" or "LOW",
  "moat": "Brief moat assessment — what's their competitive advantage? (1-2 sentences)",
  "dropReason": "SENTIMENT" or "STRUCTURAL" or "NONE" — why did the stock drop?",
  "dropExplanation": "Plain English: why the price dropped and whether it matters long-term (1-2 sentences)",
  "intrinsicValue": estimated intrinsic value as a number (or null if unsure),
  "buyAtPrice": the price level to buy at (SMA support or key level) as a number (or null),
  "summary": "2-3 sentence plain English summary. What should I do and why? Written for someone who doesn't know finance jargon."
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.`;

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
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "Gemini API failed" }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(jsonStr);

    return NextResponse.json({
      symbol,
      ...analysis,
      technicalSignal: quoteData?.signal ?? null,
      price: quoteData?.price ?? null,
    });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
