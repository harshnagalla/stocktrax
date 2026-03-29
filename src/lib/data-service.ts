// Unified data service: Yahoo Finance (primary) → Twelve Data (fallback)
// No API key needed for Yahoo. Twelve Data key optional for fallback.

import { fetchYahooQuotes, fetchYahooHistory, type YahooQuote, type YahooHistoricalPrice } from "./yahoo/client";

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

function yahooToStockQuote(q: YahooQuote): StockQuote {
  return {
    symbol: q.symbol,
    name: q.longName ?? q.shortName ?? q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    pe: q.trailingPE,
    forwardPE: q.forwardPE,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyDayMA: q.fiftyDayAverage,
    twoHundredDayMA: q.twoHundredDayAverage,
    beta: q.beta ?? null,
    sector: q.sector ?? null,
  };
}

// Cache
const quoteCache = new Map<string, { data: Record<string, StockQuote>; ts: number }>();
const historyCache = new Map<string, { data: HistoricalPrice[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function isFresh(ts: number): boolean {
  return Date.now() - ts < CACHE_TTL;
}

export async function getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const key = symbols.sort().join(",");
  const cached = quoteCache.get(key);
  if (cached && isFresh(cached.ts)) return cached.data;

  // Try Yahoo first
  const yahoo = await fetchYahooQuotes(symbols);
  if (Object.keys(yahoo).length > 0) {
    const result: Record<string, StockQuote> = {};
    for (const [sym, q] of Object.entries(yahoo)) {
      result[sym] = yahooToStockQuote(q);
    }
    quoteCache.set(key, { data: result, ts: Date.now() });
    return result;
  }

  // Yahoo failed — return empty (Twelve Data fallback would go here with API key)
  console.warn("Yahoo Finance failed for:", symbols);
  return {};
}

export async function getHistory(symbol: string): Promise<HistoricalPrice[]> {
  const cached = historyCache.get(symbol);
  if (cached && isFresh(cached.ts)) return cached.data;

  const data = await fetchYahooHistory(symbol, "1y", "1d");
  if (data.length > 0) {
    historyCache.set(symbol, { data, ts: Date.now() });
  }
  return data;
}

// Calculate SMA from historical prices (no API needed)
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= prices.length - period; i++) {
    const slice = prices.slice(i, i + period);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

// Calculate EMA from historical prices
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  // First EMA = SMA of first `period` values
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// Calculate RSI from historical prices
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
