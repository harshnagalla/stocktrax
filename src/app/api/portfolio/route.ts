import { NextResponse } from "next/server";

// Batch fetch all portfolio tickers with price + 1yr history for SMA calculation
// GET /api/portfolio

const PORTFOLIO_TICKERS = [
  "ALM", "DOCU", "LULU", "MSFT", "QQQ", "SNAP", "UNH", "VOO", "VTWO", "XLV",
  "M44U.SI",
  "NNDM", "CWEB", "ISRG", "ATEC", "NKE", "SHOP", "IBIT", "AMZN", "AMD", "GOOGL",
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

export async function GET() {
  const results: Record<string, unknown> = {};

  // Fetch 1yr chart for each ticker — gives us price + historical for SMA calc
  await Promise.all(
    PORTFOLIO_TICKERS.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return;

        const meta = result.meta;
        const ohlcv = result.indicators?.quote?.[0] ?? {};
        const closes: number[] = (ohlcv.close ?? []).filter((c: number | null) => c != null);

        const price = meta.regularMarketPrice ?? 0;
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prev;
        const changePercent = prev > 0 ? (change / prev) * 100 : 0;

        const sma50 = calcSMA(closes, 50);
        const sma150 = calcSMA(closes, 150);
        const sma200 = calcSMA(closes, 200);
        const rsi = calcRSI(closes);

        // Determine signal based on Adam Khoo methodology
        const aboveSma50 = price > sma50;
        const aboveSma150 = price > sma150;
        const aboveSma200 = price > sma200;
        const sma50Above150 = sma50 > sma150;

        let signal: "BUY MORE" | "HOLD" | "SELL" | "WATCH";
        let reason: string;
        let buyAt: number | null = null;

        if (sma50 === 0) {
          // Not enough data
          signal = "HOLD";
          reason = "Not enough price history to analyze";
        } else if (!aboveSma200 && !sma50Above150) {
          // Downtrend — both SMAs pointing wrong way
          signal = "SELL";
          reason = `In downtrend. Price ($${price.toFixed(0)}) below 200 SMA ($${sma200.toFixed(0)}). Consider cutting losses.`;
        } else if (aboveSma150 && aboveSma200 && sma50Above150) {
          // Strong uptrend
          if (rsi < 35) {
            signal = "BUY MORE";
            buyAt = Math.round(sma50);
            reason = `Strong uptrend with RSI oversold (${rsi.toFixed(0)}). Good entry near 50 SMA support at $${sma50.toFixed(0)}.`;
          } else if (price < sma50 * 1.02) {
            signal = "BUY MORE";
            buyAt = Math.round(sma50);
            reason = `Pulling back to 50 SMA support ($${sma50.toFixed(0)}). Ideal Trend Retracement entry.`;
          } else {
            signal = "HOLD";
            reason = `Uptrend intact. 50 SMA ($${sma50.toFixed(0)}) > 150 SMA ($${sma150.toFixed(0)}). Hold for long term.`;
          }
        } else if (aboveSma200 && !sma50Above150) {
          // Transitioning
          signal = "WATCH";
          reason = `Trend transitioning. 50 SMA crossing 150 SMA. Wait for clarity before adding.`;
          buyAt = Math.round(sma150);
        } else if (!aboveSma50 && aboveSma150) {
          // Correction in uptrend
          if (rsi < 35) {
            signal = "BUY MORE";
            buyAt = Math.round(sma150);
            reason = `Correction with RSI oversold (${rsi.toFixed(0)}). Support at 150 SMA ($${sma150.toFixed(0)}).`;
          } else {
            signal = "WATCH";
            reason = `Short-term pullback. Watch for bounce off 150 SMA ($${sma150.toFixed(0)}).`;
            buyAt = Math.round(sma150);
          }
        } else {
          signal = "HOLD";
          reason = `Mixed signals. Hold current position, monitor trend.`;
        }

        results[symbol] = {
          symbol,
          name: meta.longName ?? meta.shortName ?? symbol,
          price: Math.round(price * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
          sma50: Math.round(sma50 * 100) / 100,
          sma150: Math.round(sma150 * 100) / 100,
          sma200: Math.round(sma200 * 100) / 100,
          rsi: Math.round(rsi),
          signal,
          reason,
          buyAt,
        };
      } catch {
        // Skip failed symbols
      }
    })
  );

  return NextResponse.json(results);
}
