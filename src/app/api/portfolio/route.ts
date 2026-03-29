import { NextResponse } from "next/server";

// Batch fetch all portfolio tickers in one API route call
// GET /api/portfolio

const PORTFOLIO_TICKERS = [
  "ALM", "DOCU", "LULU", "MSFT", "QQQ", "SNAP", "UNH", "VOO", "VTWO", "XLV",
  "NNDM", "CWEB", "ISRG", "ATEC", "NKE", "SHOP", "IBIT", "AMZN", "AMD", "GOOGL",
];

export async function GET() {
  const results: Record<string, unknown> = {};

  // Fetch all portfolio tickers in parallel
  await Promise.all(
    PORTFOLIO_TICKERS.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return;

        const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
        const price = meta.regularMarketPrice ?? 0;
        const change = price - prev;
        const changePercent = prev > 0 ? (change / prev) * 100 : 0;

        results[symbol] = {
          symbol,
          name: meta.longName ?? meta.shortName ?? symbol,
          price: Math.round(price * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          volume: meta.regularMarketVolume ?? 0,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
        };
      } catch {
        // Skip failed symbols
      }
    })
  );

  return NextResponse.json(results);
}
