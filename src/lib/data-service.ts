// Unified data service — calls our own Next.js API routes
// Server handles Yahoo Finance + Twelve Data fallback
// No external API calls from the browser — no CORS, no key exposure

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  forwardPE: number | null;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  fiftyDayMA: number;
  twoHundredDayMA: number;
  beta: number | null;
  sector: string | null;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Cache
const quoteCache = new Map<string, { data: Record<string, StockQuote>; ts: number }>();
const historyCache = new Map<string, { data: HistoricalPrice[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function isFresh(ts: number): boolean {
  return Date.now() - ts < CACHE_TTL;
}

export async function getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const key = symbols.sort().join(",");
  const cached = quoteCache.get(key);
  if (cached && isFresh(cached.ts)) return cached.data;

  try {
    const res = await fetch(`/api/quotes?symbols=${symbols.join(",")}`);
    if (!res.ok) return {};
    const data = await res.json();

    // Map to StockQuote shape
    const result: Record<string, StockQuote> = {};
    for (const [sym, q] of Object.entries(data) as [string, Record<string, unknown>][]) {
      result[sym] = {
        symbol: sym,
        name: (q.name as string) ?? sym,
        price: (q.price as number) ?? 0,
        change: (q.change as number) ?? 0,
        changePercent: (q.changePercent as number) ?? 0,
        volume: (q.volume as number) ?? 0,
        marketCap: (q.marketCap as number) ?? 0,
        pe: null,
        forwardPE: null,
        fiftyTwoWeekLow: (q.fiftyTwoWeekLow as number) ?? 0,
        fiftyTwoWeekHigh: (q.fiftyTwoWeekHigh as number) ?? 0,
        fiftyDayMA: (q.fiftyDayAverage as number) ?? 0,
        twoHundredDayMA: (q.twoHundredDayAverage as number) ?? 0,
        beta: null,
        sector: null,
      };
    }

    quoteCache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch {
    return {};
  }
}

export async function getHistory(symbol: string): Promise<HistoricalPrice[]> {
  const cached = historyCache.get(symbol);
  if (cached && isFresh(cached.ts)) return cached.data;

  try {
    const res = await fetch(`/api/history?symbol=${symbol}`);
    if (!res.ok) return [];
    const data = await res.json();
    const prices: HistoricalPrice[] = data.prices ?? [];
    if (prices.length > 0) {
      historyCache.set(symbol, { data: prices, ts: Date.now() });
    }
    return prices;
  } catch {
    return [];
  }
}

// Calculate SMA from prices (oldest first)
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= prices.length - period; i++) {
    const slice = prices.slice(i, i + period);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

// Calculate RSI from prices (oldest first)
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [];
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return result;
}
