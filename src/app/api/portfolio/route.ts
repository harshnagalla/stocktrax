import { NextResponse } from "next/server";
import { getTechnicalSnapshot, getTrendSignal, round2 } from "@/lib/analysis-engine";

// Batch fetch all portfolio tickers with price + 1yr history for SMA calculation
// GET /api/portfolio

const PORTFOLIO_TICKERS = [
  "ALM", "DOCU", "LULU", "MSFT", "QQQ", "SNAP", "UNH", "VOO", "VTWO", "XLV",
  "NNDM", "CWEB", "ISRG", "ATEC", "NKE", "SHOP", "IBIT", "AMZN", "AMD", "GOOGL",
];

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

        const snapshot = getTechnicalSnapshot(closes);
        const trend = getTrendSignal(price, snapshot);
        const signal = trend.signal === "BUY" ? "BUY MORE" : trend.signal;

        results[symbol] = {
          symbol,
          name: meta.longName ?? meta.shortName ?? symbol,
          price: round2(price),
          change: round2(change),
          changePercent: round2(changePercent),
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
          ma5: round2(snapshot.ma5),
          ma10: round2(snapshot.ma10),
          ma20: round2(snapshot.ma20),
          ma60: round2(snapshot.ma60),
          sma50: round2(snapshot.sma50),
          sma150: round2(snapshot.sma150),
          sma200: round2(snapshot.sma200),
          rsi: Math.round(snapshot.rsi),
          signal,
          reason: trend.reason,
          buyAt: trend.buyAt,
        };
      } catch {
        // Skip failed symbols
      }
    })
  );

  return NextResponse.json(results);
}
