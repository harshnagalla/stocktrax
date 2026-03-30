import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";

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

          // Adam Khoo Composite Score (0-100)
          let score = 0;
          let reasons: string[] = [];

          // Trend alignment (40 points)
          if (price > sma50 && sma50 > sma150 && sma150 > sma200) {
            score += 40;
            reasons.push("Strong uptrend");
          } else if (price > sma150 && sma50 > sma150) {
            score += 30;
            reasons.push("Uptrend with pullback");
          } else if (price > sma200) {
            score += 15;
            reasons.push("Above 200 SMA");
          } else {
            reasons.push("Below 200 SMA");
          }

          // RSI timing (20 points)
          if (rsi < 30) { score += 20; reasons.push("RSI oversold"); }
          else if (rsi < 40) { score += 15; reasons.push("RSI approaching oversold"); }
          else if (rsi < 50) { score += 10; }
          else if (rsi > 70) { reasons.push("RSI overbought"); }

          // Near support (20 points)
          const nearSma50 = Math.abs(price - sma50) / price < 0.03;
          const nearSma150 = Math.abs(price - sma150) / price < 0.05;
          if (nearSma50 && price > sma150) { score += 20; reasons.push("At 50 SMA support"); }
          else if (nearSma150 && price > sma200) { score += 15; reasons.push("At 150 SMA support"); }

          // Near 52-week low (20 points — potential value)
          const range = meta.fiftyTwoWeekHigh - meta.fiftyTwoWeekLow;
          const posInRange = range > 0 ? (price - meta.fiftyTwoWeekLow) / range : 0.5;
          if (posInRange < 0.2) { score += 20; reasons.push("Near 52W lows"); }
          else if (posInRange < 0.35) { score += 10; reasons.push("Lower half of range"); }

          // Determine signal
          let signal: string;
          if (score >= 70) signal = "STRONG BUY";
          else if (score >= 50) signal = "BUY";
          else if (score >= 35) signal = "WATCH";
          else if (price < sma200 && rsi > 50) signal = "AVOID";
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

  return NextResponse.json({
    total: results.length,
    strongBuys: results.filter((r) => r.signal === "STRONG BUY").length,
    buys: results.filter((r) => r.signal === "BUY").length,
    results,
  });
}
