import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";

// Top S&P 500 stocks by sector — curated for Adam Khoo's methodology
// Excludes defensive/overvalued sectors (WMT, KO, PEP, COST per his advice)
const SCREEN_TICKERS = [
  // Tech — Software & Cloud
  "MSFT", "AAPL", "GOOG", "META", "AMZN", "NVDA", "CRM", "ADBE", "NOW", "INTU",
  "PLTR", "PANW", "CRWD", "FTNT", "SNOW", "DDOG", "NET", "ZS", "TEAM", "HUBS",
  // Semiconductors
  "AMD", "AVGO", "QCOM", "MRVL", "LRCX", "KLAC", "AMAT", "MU", "TXN", "ADI",
  // Payments & Fintech
  "V", "MA", "PYPL", "SQ", "SPGI", "ICE", "FIS", "GPN",
  // Healthcare
  "UNH", "ISRG", "TMO", "DHR", "ABT", "SYK", "BSX", "MDT", "ELV", "CI",
  // Consumer & Internet
  "NFLX", "UBER", "BKNG", "ABNB", "SHOP", "MELI", "LULU", "NKE",
  // Industrial Tech
  "CAT", "DE", "GE", "HON", "LMT", "RTX",
];

function calcSMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

interface ScreenResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  score: number; // Adam Khoo composite score
  signal: string;
  reason: string;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const results: ScreenResult[] = [];

  // Fetch in batches of 10 to avoid overwhelming Yahoo
  const batchSize = 10;
  for (let i = 0; i < SCREEN_TICKERS.length; i += batchSize) {
    const batch = SCREEN_TICKERS.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
            { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } } // cache 1hr
          );
          if (!res.ok) return;
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (!result) return;

          const meta = result.meta;
          const ohlcv = result.indicators?.quote?.[0] ?? {};
          const closes: number[] = (ohlcv.close ?? []).filter((c: number | null) => c != null);
          if (closes.length < 200) return;

          const price = meta.regularMarketPrice ?? 0;
          const prev = meta.chartPreviousClose ?? price;
          const changePercent = prev > 0 ? ((price - prev) / prev) * 100 : 0;

          const sma50 = calcSMA(closes, 50);
          const sma150 = calcSMA(closes, 150);
          const sma200 = calcSMA(closes, 200);
          const rsi = calcRSI(closes);

          // Backtest-validated scoring (0-100)
          // Key insight: pullbacks in uptrends + transition zones score highest
          let score = 0;
          let reasons: string[] = [];

          const distFromSma50 = sma50 > 0 ? ((price - sma50) / sma50) * 100 : 0;
          const aboveSma50 = price > sma50;
          const aboveSma150 = price > sma150;
          const aboveSma200 = price > sma200;
          const sma50Above150 = sma50 > sma150;

          // Pullback opportunity (35 points) — the actual money-making setup
          if (aboveSma150 && sma50Above150 && !aboveSma50) {
            score += 35;
            reasons.push("Pullback below 50 SMA in uptrend");
          } else if (aboveSma200 && !sma50Above150) {
            // Transition zone — backtest showed +10.45% avg return
            score += 30;
            reasons.push("Transition zone — historically best entry");
          } else if (aboveSma50 && sma50Above150 && distFromSma50 < 3) {
            score += 20;
            reasons.push("Near 50 SMA support");
          } else if (aboveSma50 && sma50Above150) {
            score += 10;
            reasons.push("Uptrend — wait for pullback");
          }

          // RSI timing (30 points) — oversold in uptrend is the trigger
          if (rsi < 25) { score += 30; reasons.push("RSI deeply oversold"); }
          else if (rsi < 35) { score += 25; reasons.push("RSI oversold"); }
          else if (rsi < 45) { score += 15; reasons.push("RSI approaching oversold"); }
          else if (rsi > 70) { score -= 10; reasons.push("RSI overbought — wait"); }

          // 52-week position (20 points)
          const range = meta.fiftyTwoWeekHigh - meta.fiftyTwoWeekLow;
          const posInRange = range > 0 ? (price - meta.fiftyTwoWeekLow) / range : 0.5;
          if (posInRange < 0.25) { score += 20; reasons.push("Near 52W lows — potential value"); }
          else if (posInRange < 0.4) { score += 10; reasons.push("Lower range"); }
          else if (posInRange > 0.9) { score -= 5; reasons.push("Near 52W highs"); }

          // Above 200 SMA baseline (15 points)
          if (aboveSma200) { score += 15; }
          else { reasons.push("Below 200 SMA"); }

          // Cap at 0-100
          score = Math.max(0, Math.min(100, score));

          let signal: string;
          if (score >= 65) signal = "STRONG BUY";
          else if (score >= 45) signal = "BUY";
          else if (score >= 25 && aboveSma200) signal = "WATCH";
          else if (!aboveSma150 && !sma50Above150) signal = "AVOID";
          else signal = "HOLD";

          results.push({
            symbol,
            name: meta.longName ?? meta.shortName ?? symbol,
            price: Math.round(price * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            sma50: Math.round(sma50 * 100) / 100,
            sma150: Math.round(sma150 * 100) / 100,
            sma200: Math.round(sma200 * 100) / 100,
            rsi: Math.round(rsi),
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
            score,
            signal,
            reason: reasons.join(". "),
          });
        } catch { /* skip */ }
      })
    );
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Run Gemini deep analysis on top 15 stocks
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const cacheKey = `screener-ai:${todayKey()}`;
  let aiData: Record<string, { analysis: string; fundamentalScore: number; moatScore: number; targetUpside: number }> = {};

  const cached = await getCached<typeof aiData>(cacheKey);
  if (cached) {
    aiData = cached;
  } else if (GEMINI_API_KEY) {
    const top15 = results.slice(0, 15);
    const summaries = top15.map((s) =>
      `${s.symbol}(${s.name}): $${s.price}, ${s.changePercent}%, RSI ${s.rsi}, 50SMA $${s.sma50.toFixed(0)}, Score ${s.score}`
    ).join("\n");

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analyze these top 15 screened stocks. For each, give: fundamentalScore (0-100 based on moat, growth, competitive position), moatScore (1-5), targetUpside (% to intrinsic value), analysis (one line: moat type + why it's a good/bad pick now).\n\n${summaries}\n\nReturn JSON: {"MSFT":{"fundamentalScore":90,"moatScore":5,"targetUpside":40,"analysis":"Wide moat via cloud+enterprise. Sentiment drop = opportunity."}}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4000, responseMimeType: "application/json" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts ?? [];
        let text = "";
        for (const part of parts) { if (part.text && !part.thought) text += part.text; }
        if (text) {
          try { aiData = JSON.parse(text); } catch { /* skip */ }
          if (Object.keys(aiData).length > 0) await setCache(cacheKey, aiData);
        }
      }
    } catch { /* Gemini failed, continue with technical-only results */ }
  }

  // Merge AI data into results
  const enriched = results.map((r) => {
    const ai = aiData[r.symbol];
    if (ai) {
      return { ...r, analysis: ai.analysis, fundamentalScore: ai.fundamentalScore, moatScore: ai.moatScore, targetUpside: ai.targetUpside };
    }
    return r;
  });

  return NextResponse.json({
    total: enriched.length,
    strongBuys: enriched.filter((r) => r.signal === "STRONG BUY").length,
    buys: enriched.filter((r) => r.signal === "BUY").length,
    results: enriched,
  });
}
