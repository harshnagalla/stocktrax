import { NextRequest, NextResponse } from "next/server";
import { validateSymbol, validateRange, checkRateLimit } from "@/lib/api-utils";

// Server-side historical price proxy
// GET /api/history?symbol=MSFT&range=1y

type HistoricalPrice = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function getTwelveDataKey(): string | undefined {
  return process.env.TWELVE_DATA_API_KEY ?? process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
}

async function fetchYahooHistory(symbol: string, range: string): Promise<HistoricalPrice[] | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const timestamps: number[] = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0] ?? {};

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().split("T")[0],
    open: Math.round((ohlcv.open?.[i] ?? 0) * 100) / 100,
    high: Math.round((ohlcv.high?.[i] ?? 0) * 100) / 100,
    low: Math.round((ohlcv.low?.[i] ?? 0) * 100) / 100,
    close: Math.round((ohlcv.close?.[i] ?? 0) * 100) / 100,
    volume: ohlcv.volume?.[i] ?? 0,
  }));
}

async function fetchTwelveDataHistory(symbol: string): Promise<HistoricalPrice[] | null> {
  const tdKey = getTwelveDataKey();
  if (!tdKey) return null;

  const res = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=250&apikey=${encodeURIComponent(tdKey)}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status === "error" || !Array.isArray(data.values)) return null;

  return [...data.values].reverse().map((v: Record<string, string>) => ({
    date: v.datetime,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseInt(v.volume),
  }));
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const range = request.nextUrl.searchParams.get("range") ?? "1y";

  if (!symbol || !validateSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  if (!validateRange(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  try {
    const yahooPrices = await fetchYahooHistory(symbol, range);
    if (yahooPrices) return NextResponse.json({ symbol, prices: yahooPrices });
  } catch {
    // Try fallback below.
  }

  try {
    const twelveDataPrices = await fetchTwelveDataHistory(symbol);
    if (twelveDataPrices) return NextResponse.json({ symbol, prices: twelveDataPrices });
  } catch {
    // Return a consistent error below.
  }

  return NextResponse.json({ error: "All data sources failed" }, { status: 502 });
}
