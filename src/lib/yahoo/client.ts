// Yahoo Finance unofficial API — free, no key needed
// Uses the v8 finance endpoint which returns JSON

const BASE = "https://query1.finance.yahoo.com/v8/finance";

export interface YahooQuote {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayLow: number;
  regularMarketDayHigh: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  marketCap: number;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  averageVolume: number;
  sector?: string;
  industry?: string;
  beta?: number;
}

export interface YahooHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch quotes for multiple symbols in one call
export async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, YahooQuote>> {
  const url = `${BASE}/quote?symbols=${symbols.join(",")}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const data = await res.json();
    const results = data?.quoteResponse?.result ?? [];
    const map: Record<string, YahooQuote> = {};
    for (const q of results) {
      map[q.symbol] = {
        symbol: q.symbol,
        shortName: q.shortName ?? null,
        longName: q.longName ?? null,
        regularMarketPrice: q.regularMarketPrice ?? 0,
        regularMarketChange: q.regularMarketChange ?? 0,
        regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
        regularMarketVolume: q.regularMarketVolume ?? 0,
        regularMarketDayLow: q.regularMarketDayLow ?? 0,
        regularMarketDayHigh: q.regularMarketDayHigh ?? 0,
        regularMarketOpen: q.regularMarketOpen ?? 0,
        regularMarketPreviousClose: q.regularMarketPreviousClose ?? 0,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
        marketCap: q.marketCap ?? 0,
        trailingPE: q.trailingPE ?? null,
        forwardPE: q.forwardPE ?? null,
        priceToBook: q.priceToBook ?? null,
        fiftyDayAverage: q.fiftyDayAverage ?? 0,
        twoHundredDayAverage: q.twoHundredDayAverage ?? 0,
        averageVolume: q.averageDailyVolume3Month ?? 0,
        sector: q.sector,
        industry: q.industry,
        beta: q.beta,
      };
    }
    return map;
  } catch (err) {
    console.error("Yahoo Finance fetch failed:", err);
    return {};
  }
}

// Fetch historical prices via chart endpoint
export async function fetchYahooHistory(
  symbol: string,
  range: string = "1y",
  interval: string = "1d"
): Promise<YahooHistoricalPrice[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0] ?? {};

    return timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      open: ohlcv.open?.[i] ?? 0,
      high: ohlcv.high?.[i] ?? 0,
      low: ohlcv.low?.[i] ?? 0,
      close: ohlcv.close?.[i] ?? 0,
      volume: ohlcv.volume?.[i] ?? 0,
    }));
  } catch (err) {
    console.error("Yahoo chart fetch failed:", err);
    return [];
  }
}
