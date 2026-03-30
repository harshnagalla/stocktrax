import { NextResponse } from "next/server";

// Batch fetch all portfolio tickers with price + 1yr history for SMA calculation
// GET /api/portfolio

const PORTFOLIO_TICKERS = [
  "ALM", "DOCU", "LULU", "MSFT", "QQQ", "SNAP", "UNH", "VOO", "VTWO", "XLV",
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
        // Daily change from last 2 closes (not chartPreviousClose which is range-start)
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        const sma50 = calcSMA(closes, 50);
        const sma150 = calcSMA(closes, 150);
        const sma200 = calcSMA(closes, 200);
        const rsi = calcRSI(closes);

        // Signal logic — redesigned after backtest validation
        const aboveSma50 = price > sma50;
        const aboveSma150 = price > sma150;
        const aboveSma200 = price > sma200;
        const sma50Above150 = sma50 > sma150;
        const distFromSma50 = sma50 > 0 ? ((price - sma50) / sma50) * 100 : 0;

        let signal: "BUY MORE" | "HOLD" | "SELL" | "WATCH";
        let reason: string;
        let buyAt: number | null = null;

        if (sma50 === 0) {
          signal = "HOLD";
          reason = "Not enough price history";
        } else if (aboveSma150 && sma50Above150 && !aboveSma50 && rsi < 35) {
          // Pullback into support + oversold = best entry
          signal = "BUY MORE";
          buyAt = Math.round(price);
          reason = `Pullback with RSI oversold (${rsi.toFixed(0)}). Below 50 SMA ($${sma50.toFixed(0)}) but uptrend intact. Best entry zone.`;
        } else if (aboveSma200 && sma50Above150 && distFromSma50 < 3 && rsi < 40) {
          // Deep pullback near 150 SMA
          signal = "BUY MORE";
          buyAt = Math.round(sma150);
          reason = `Deep pullback near 150 SMA ($${sma150.toFixed(0)}). RSI ${rsi.toFixed(0)}. Strong entry if uptrend holds.`;
        } else if (aboveSma200 && !sma50Above150 && rsi < 45) {
          // Transition zone — backtest showed best returns here
          signal = "BUY MORE";
          buyAt = Math.round(sma200);
          reason = `Early recovery zone. Above 200 SMA, trend transitioning. Historically strongest return zone. Start small.`;
        } else if (aboveSma50 && sma50Above150 && distFromSma50 > 5) {
          // Extended above 50 SMA
          signal = "HOLD";
          reason = `Uptrend but ${distFromSma50.toFixed(0)}% above 50 SMA — too extended. Wait for pullback to $${sma50.toFixed(0)}.`;
          buyAt = Math.round(sma50);
        } else if (aboveSma150 && sma50Above150) {
          signal = "HOLD";
          reason = `Uptrend intact. Hold, add on pullbacks below 50 SMA ($${sma50.toFixed(0)}).`;
          buyAt = Math.round(sma50);
        } else if (!aboveSma150 && !sma50Above150) {
          // Downtrend — fires earlier than before (at 150 SMA break, not 200)
          signal = "SELL";
          reason = `Downtrend. Below 150 SMA ($${sma150.toFixed(0)}), 50 crossed below 150. Cut losses, redeploy to stronger stocks.`;
        } else if (!aboveSma200 && sma50Above150) {
          signal = "WATCH";
          reason = `Below 200 SMA ($${sma200.toFixed(0)}) but 50>150 intact. Wait for 200 SMA reclaim.`;
          buyAt = Math.round(sma200);
        } else {
          signal = "HOLD";
          reason = `Mixed signals. RSI ${rsi.toFixed(0)}. Monitor trend.`;
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
