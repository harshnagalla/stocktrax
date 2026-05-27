import { NextRequest, NextResponse } from "next/server";
import { validateSymbol, checkRateLimit } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";
import { callAI } from "@/lib/ai";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an investment analyst combining Adam Khoo's 7-Step Formula with institutional-grade technical analysis.

Adam Khoo rules:
- Moat (gross margin >25%, ROE >15%, revenue growth >10%/yr)
- Debt <3x net income
- Buy SENTIMENT drops, avoid STRUCTURAL declines
- Entry: 50 SMA > 150 SMA, buy pullbacks to MA support
- PEG < 1 = undervalued

Technical rules (non-negotiable):
- bias_ma5 > 5% = DO NOT BUY (chasing)
- MA5 > MA10 > MA20 = bullish alignment required
- Ideal buy: shrink-volume pullback to MA5/MA10 support
- signal_score < 40 = HOLD at best regardless of fundamentals

Decision weighting:
- Technical: 40%
- Intelligence/News: 30%
- Risk factors: 30%
- High-severity risk = hard cap at HOLD

Sniper points must use REAL price levels from the data provided. No made-up numbers.
Return ONLY valid JSON matching the Decision Dashboard schema. No markdown.`;

// ─── Decision Dashboard Schema (shown to LLM as template) ────────────────────

const SCHEMA_TEMPLATE = `{
  "stock_name": "Full company name",
  "sentiment_score": 0,
  "decision_type": "buy|hold|sell",
  "confidence_level": "HIGH|MEDIUM|LOW",
  "operation_advice": "short action string",
  "analysis_summary": "2-3 sentences",
  "dashboard": {
    "core_conclusion": {
      "one_sentence": "≤30 chars, action-first",
      "signal_type": "buy|hold|sell",
      "time_sensitivity": "immediate|this_week|this_month",
      "position_advice": {
        "no_position": "what to do if not holding",
        "has_position": "what to do if already holding"
      }
    },
    "data_perspective": {
      "trend_status": {
        "ma_alignment": "bullish|neutral|bearish",
        "is_bullish": true,
        "trend_score": 0
      },
      "price_position": {
        "current_price": 0,
        "ma5": 0,
        "ma10": 0,
        "ma20": 0,
        "bias_ma5": 0,
        "bias_status": "ideal|ok|chase|below",
        "support_level": 0,
        "resistance_level": 0
      },
      "volume_analysis": {
        "volume_status": "heavy_up|shrink_down|normal|heavy_down",
        "volume_meaning": "what the volume pattern means"
      }
    },
    "intelligence": {
      "latest_news": "most impactful recent news",
      "risk_alerts": ["specific risk 1", "specific risk 2"],
      "positive_catalysts": ["catalyst 1", "catalyst 2"],
      "sentiment_summary": "overall market sentiment"
    },
    "battle_plan": {
      "sniper_points": {
        "ideal_buy": 0,
        "secondary_buy": 0,
        "stop_loss": 0,
        "take_profit": 0
      },
      "position_strategy": {
        "suggested_position": "5-10% of portfolio",
        "entry_plan": "how to enter",
        "risk_control": "how to manage risk"
      },
      "action_checklist": ["condition met or risk present"]
    }
  },
  "risk_warning": "main risk in one sentence"
}`;

// ─── JSON extraction with brace-matching fallback ─────────────────────────────

function extractJSON(text: string): unknown {
  // Fast path: direct parse
  try {
    return JSON.parse(text);
  } catch { /* try fallback */ }

  // Brace-matching: find outermost {...}
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");

  let depth = 0;
  let end = start;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
    if (depth === 0) { end = i + 1; break; }
  }

  return JSON.parse(text.slice(start, end));
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Symbol validation
  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol || !validateSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid or missing symbol" }, { status: 400 });
  }

  // API key guard
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: "AI Gateway API key not configured" }, { status: 500 });
  }

  // Cache check (skip if ?refresh=true)
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";
  const cacheKey = `deep-analysis:${symbol}:${todayKey()}`;
  if (!refresh) {
    const cached = await getCached(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  // ── Fetch technical data from internal quotes API ──────────────────────────
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  let techBlock = `Symbol: ${symbol}\nNo additional technical data available.`;

  try {
    const quoteRes = await fetch(
      `${origin}/api/quotes?symbols=${symbol}&analyze=true`,
      { headers: { "x-internal": "1" } }
    );
    if (quoteRes.ok) {
      const quotes = await quoteRes.json();
      const q = quotes[symbol] as {
        name?: string;
        price?: number;
        change?: number;
        changePercent?: number;
        fiftyTwoWeekLow?: number;
        fiftyTwoWeekHigh?: number;
        ma5?: number;
        ma10?: number;
        ma20?: number;
        ma60?: number;
        sma50?: number;
        sma150?: number;
        sma200?: number;
        rsi?: number;
        signal?: string;
        reason?: string;
        buyAt?: number | null;
      } | undefined;

      if (q) {
        const price = q.price ?? 0;
        const ma5 = q.ma5 ?? 0;
        const ma10 = q.ma10 ?? 0;
        const ma20 = q.ma20 ?? 0;
        const ma60 = q.ma60 ?? 0;
        const sma50 = q.sma50 ?? 0;
        const sma150 = q.sma150 ?? 0;
        const sma200 = q.sma200 ?? 0;

        const biasMA5 =
          ma5 > 0 ? (((price - ma5) / ma5) * 100).toFixed(2) : "N/A";

        // MA alignment summary
        const maAlignment =
          ma5 > ma10 && ma10 > ma20 && sma50 > sma150 && sma150 > sma200
            ? "bullish (MA5 > MA10 > MA20 and MA50 > MA150 > MA200)"
            : ma5 < ma10 && ma10 < ma20
            ? "bearish (MA5 < MA10 < MA20)"
            : "neutral";

        // 52-week range position
        const low52 = q.fiftyTwoWeekLow ?? 0;
        const high52 = q.fiftyTwoWeekHigh ?? 0;
        const rangePos =
          high52 > low52
            ? (((price - low52) / (high52 - low52)) * 100).toFixed(1)
            : "N/A";

        techBlock = [
          `Symbol: ${symbol}`,
          `Name: ${q.name ?? symbol}`,
          `Current Price: $${price}`,
          `Daily Change: ${q.change ?? 0} (${q.changePercent ?? 0}%)`,
          `52-Week Range: $${low52} – $${high52} (${rangePos}% of range)`,
          ``,
          `Short-Term Moving Averages:`,
          `  5 MA:    $${ma5}`,
          `  10 MA:   $${ma10}`,
          `  20 MA:   $${ma20}`,
          `  60 MA:   $${ma60}`,
          ``,
          `Long-Term Moving Averages:`,
          `  50 SMA:  $${sma50}`,
          `  150 SMA: $${sma150}`,
          `  200 SMA: $${sma200}`,
          `  MA Alignment: ${maAlignment}`,
          `  Bias vs 5 MA: ${biasMA5}%`,
          ``,
          `RSI (14): ${q.rsi ?? "N/A"}`,
          `Signal: ${q.signal ?? "N/A"}`,
          `Signal Reason: ${q.reason ?? "N/A"}`,
          `Suggested Buy Level: ${q.buyAt != null ? `$${q.buyAt}` : "N/A"}`,
          ``,
          `For bias_ma5 use the Bias vs 5 MA value above. For sniper_points, derive price`,
          `levels from the moving average values and RSI provided — do NOT invent numbers.`,
        ].join("\n");
      }
    }
  } catch (err) {
    console.warn("deep-analysis: quote fetch failed, continuing without data:", err);
  }

  // ── Build prompt ───────────────────────────────────────────────────────────

  const prompt = `LIVE TECHNICAL DATA (use ONLY these numbers — do NOT invent prices):
${techBlock}

Analyze ${symbol} and return a Decision Dashboard JSON object.

CRITICAL RULES:
1. sniper_points values (ideal_buy, secondary_buy, stop_loss, take_profit) MUST be derived from the moving averages and RSI in the data above. No invented numbers.
2. bias_ma5: if Bias vs 5 MA > 5%, set bias_status to "chase" and decision_type must be "hold".
3. If signal_score equivalent (technicalScore) < 40, cap decision_type at "hold".
4. action_checklist items should be prefixed: ✅ for conditions met, ⚠️ for things to watch, ❌ for active risks.
5. sentiment_score: 0–100 where >60 = bullish, 40–60 = neutral, <40 = bearish.
6. one_sentence must be ≤30 characters and be action-first (e.g. "Hold, wait for pullback").

Return ONLY valid JSON matching this exact schema. No markdown fences, no explanation:
${SCHEMA_TEMPLATE}`;

  // ── Call AI ────────────────────────────────────────────────────────────────

  try {
    const text = await callAI(prompt, {
      system: SYSTEM_PROMPT,
      temperature: 0.3,
      maxOutputTokens: 4096,
    });

    let dashboard: unknown;
    try {
      dashboard = extractJSON(text);
    } catch (parseErr) {
      console.error("deep-analysis: JSON parse failed:", parseErr, "\nRaw response:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse AI response — try again" },
        { status: 502 }
      );
    }

    const result = { symbol, generatedAt: new Date().toISOString(), ...(dashboard as object) };
    await setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("deep-analysis: AI call failed:", err);
    return NextResponse.json(
      { error: "Deep analysis failed — try again" },
      { status: 500 }
    );
  }
}
