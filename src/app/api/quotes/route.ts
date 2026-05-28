import { NextRequest, NextResponse } from "next/server";
import { validateSymbol, checkRateLimit } from "@/lib/api-utils";
import { getTechnicalSnapshot, getTrendSignal, round2 } from "@/lib/analysis-engine";

// Server-side quote + analysis proxy
// GET /api/quotes?symbols=VOO,QQQ,MSFT&analyze=true

const CASH_SYMBOL = "CASH";
const MAX_MARKET_SYMBOLS = 50;
const QUOTE_REVALIDATE_SECONDS = 60;

type QuoteEntry = Record<string, unknown>;

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getTwelveDataKey(): string | undefined {
  return process.env.TWELVE_DATA_API_KEY ?? process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
}

function buildCashQuote(): QuoteEntry {
  return {
    symbol: CASH_SYMBOL,
    name: "Cash",
    price: 1,
    change: 0,
    changePercent: 0,
    fiftyTwoWeekLow: 1,
    fiftyTwoWeekHigh: 1,
    fiftyDayAverage: 1,
    twoHundredDayAverage: 1,
    ma5: 1,
    ma10: 1,
    ma20: 1,
    ma60: 1,
    sma50: 1,
    sma150: 1,
    sma200: 1,
    rsi: 50,
    signal: "HOLD",
    reason: "Cash balance",
    buyAt: null,
  };
}

function addAnalysis(entry: QuoteEntry, price: number, closes: number[]): void {
  const snapshot = getTechnicalSnapshot(closes);
  const { signal, reason, buyAt } = getTrendSignal(price, snapshot);

  entry.ma5 = round2(snapshot.ma5);
  entry.ma10 = round2(snapshot.ma10);
  entry.ma20 = round2(snapshot.ma20);
  entry.ma60 = round2(snapshot.ma60);
  entry.sma50 = round2(snapshot.sma50);
  entry.sma150 = round2(snapshot.sma150);
  entry.sma200 = round2(snapshot.sma200);
  entry.rsi = Math.round(snapshot.rsi);
  entry.signal = signal;
  entry.reason = reason;
  entry.buyAt = buyAt;
}

async function fetchYahooQuote(symbol: string, analyze: boolean): Promise<QuoteEntry | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: QUOTE_REVALIDATE_SECONDS },
    }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta ?? {};
  const price = parseNumber(meta.regularMarketPrice) ?? 0;

  const closes: number[] = (result.indicators?.quote?.[0]?.close ?? [])
    .map(parseNumber)
    .filter((value: number | null): value is number => value != null);
  const prevClose = closes.length >= 2 ? closes[closes.length - 2] : price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  const entry: QuoteEntry = {
    symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price: round2(price),
    change: round2(change),
    changePercent: round2(changePercent),
    fiftyTwoWeekLow: parseNumber(meta.fiftyTwoWeekLow) ?? 0,
    fiftyTwoWeekHigh: parseNumber(meta.fiftyTwoWeekHigh) ?? 0,
    fiftyDayAverage: parseNumber(meta.fiftyDayAverage) ?? 0,
    twoHundredDayAverage: parseNumber(meta.twoHundredDayAverage) ?? 0,
  };

  if (analyze) {
    addAnalysis(entry, price, closes);
  }

  return entry;
}

async function fetchTwelveDataQuote(symbol: string, analyze: boolean): Promise<QuoteEntry | null> {
  const apiKey = getTwelveDataKey();
  if (!apiKey) return null;

  if (!analyze) {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: QUOTE_REVALIDATE_SECONDS } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.status === "error") return null;

    const price = parseNumber(data.close);
    if (price == null) return null;

    const prevClose = parseNumber(data.previous_close) ?? price;
    const change = parseNumber(data.change) ?? price - prevClose;
    const changePercent = parseNumber(data.percent_change) ?? (prevClose > 0 ? (change / prevClose) * 100 : 0);

    return {
      symbol,
      name: data.name ?? symbol,
      price: round2(price),
      change: round2(change),
      changePercent: round2(changePercent),
      fiftyTwoWeekLow: parseNumber(data.fifty_two_week?.low) ?? 0,
      fiftyTwoWeekHigh: parseNumber(data.fifty_two_week?.high) ?? 0,
      fiftyDayAverage: 0,
      twoHundredDayAverage: 0,
    };
  }

  const res = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=260&apikey=${encodeURIComponent(apiKey)}`,
    { next: { revalidate: QUOTE_REVALIDATE_SECONDS } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (data?.status === "error" || !Array.isArray(data?.values) || data.values.length === 0) return null;

  const values = data.values as Record<string, unknown>[];
  const latest = values[0];
  const previous = values[1];
  const price = parseNumber(latest.close);
  if (price == null) return null;

  const prevClose = parseNumber(previous?.close) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const chronological = [...values].reverse();
  const closes = chronological
    .map((value) => parseNumber(value.close))
    .filter((value): value is number => value != null);
  const lows = values
    .map((value) => parseNumber(value.low))
    .filter((value): value is number => value != null);
  const highs = values
    .map((value) => parseNumber(value.high))
    .filter((value): value is number => value != null);

  const entry: QuoteEntry = {
    symbol,
    name: data.meta?.symbol ?? symbol,
    price: round2(price),
    change: round2(change),
    changePercent: round2(changePercent),
    fiftyTwoWeekLow: lows.length > 0 ? round2(Math.min(...lows)) : 0,
    fiftyTwoWeekHigh: highs.length > 0 ? round2(Math.max(...highs)) : 0,
    fiftyDayAverage: 0,
    twoHundredDayAverage: 0,
  };

  addAnalysis(entry, price, closes);

  return entry;
}

async function fetchQuote(symbol: string, analyze: boolean): Promise<QuoteEntry | null> {
  return (await fetchYahooQuote(symbol, analyze)) ?? (await fetchTwelveDataQuote(symbol, analyze));
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbols = request.nextUrl.searchParams.get("symbols");
  const analyze = request.nextUrl.searchParams.get("analyze") === "true";

  if (!symbols) {
    return NextResponse.json({ error: "symbols param required" }, { status: 400 });
  }

  const tickers = [
    ...new Set(
      symbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s && validateSymbol(s))
    ),
  ];
  if (tickers.length === 0) {
    return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  }

  const marketTickers = tickers.filter((symbol) => symbol !== CASH_SYMBOL);
  if (marketTickers.length > MAX_MARKET_SYMBOLS) {
    return NextResponse.json({ error: `max ${MAX_MARKET_SYMBOLS} market symbols` }, { status: 400 });
  }

  const results: Record<string, QuoteEntry> = {};
  if (tickers.includes(CASH_SYMBOL)) {
    results[CASH_SYMBOL] = buildCashQuote();
  }

  await Promise.all(
    marketTickers.map(async (symbol) => {
      try {
        const entry = await fetchQuote(symbol, analyze);
        if (entry) results[symbol] = entry;
      } catch {
        // Skip failed
      }
    })
  );

  if (Object.keys(results).length === 0) {
    return NextResponse.json({ error: "All quote sources failed" }, { status: 502 });
  }

  return NextResponse.json(results);
}
