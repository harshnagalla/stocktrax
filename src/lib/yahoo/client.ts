// Yahoo Finance — uses the chart endpoint (v8) which is still accessible
// The quote endpoint (v7/v8) is now restricted, but chart works fine

export interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
}

export interface YahooHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch quote data via chart endpoint (works without auth)
export async function fetchYahooQuotes(
  symbols: string[]
): Promise<Record<string, YahooQuote>> {
  const results: Record<string, YahooQuote> = {};

  // Fetch in parallel (chart endpoint doesn't support batch)
  const promises = symbols.map(async (symbol) => {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
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
        price,
        change,
        changePercent,
        volume: meta.regularMarketVolume ?? 0,
        marketCap: 0, // chart endpoint doesn't provide market cap
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
        fiftyDayAverage: meta.fiftyDayAverage ?? 0,
        twoHundredDayAverage: meta.twoHundredDayAverage ?? 0,
      };
    } catch (err) {
      console.error(`Yahoo chart failed for ${symbol}:`, err);
    }
  });

  await Promise.all(promises);
  return results;
}

// Fetch historical prices via chart endpoint
export async function fetchYahooHistory(
  symbol: string,
  range: string = "1y",
  interval: string = "1d"
): Promise<YahooHistoricalPrice[]> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0] ?? {};

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      open: ohlcv.open?.[i] ?? 0,
      high: ohlcv.high?.[i] ?? 0,
      low: ohlcv.low?.[i] ?? 0,
      close: ohlcv.close?.[i] ?? 0,
      volume: ohlcv.volume?.[i] ?? 0,
    }));
  } catch (err) {
    console.error("Yahoo chart history failed:", err);
    return [];
  }
}
