// Twelve Data API — fallback when Yahoo Finance breaks
// Free tier: 800 req/day, 8 req/min

const BASE = "https://api.twelvedata.com";

export interface TDQuote {
  symbol: string;
  name: string;
  close: string;
  change: string;
  percent_change: string;
  volume: string;
  previous_close: string;
  fifty_two_week: {
    low: string;
    high: string;
  };
}

export async function fetchTDQuote(
  symbol: string,
  apiKey: string
): Promise<TDQuote | null> {
  try {
    const res = await fetch(`${BASE}/quote?symbol=${symbol}&apikey=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "error") return null;
    return data as TDQuote;
  } catch {
    return null;
  }
}

export async function fetchTDTimeSeries(
  symbol: string,
  apiKey: string,
  outputsize: number = 300
): Promise<Array<{ datetime: string; close: number }>> {
  try {
    const res = await fetch(
      `${BASE}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === "error") return [];
    return (data.values ?? []).map((v: { datetime: string; close: string }) => ({
      datetime: v.datetime,
      close: parseFloat(v.close),
    }));
  } catch {
    return [];
  }
}

export async function fetchTDIndicator(
  symbol: string,
  indicator: "sma" | "ema" | "rsi",
  timePeriod: number,
  apiKey: string,
  outputsize: number = 30
): Promise<Array<{ datetime: string; value: number }>> {
  try {
    const res = await fetch(
      `${BASE}/${indicator}?symbol=${symbol}&interval=1day&time_period=${timePeriod}&outputsize=${outputsize}&apikey=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === "error") return [];
    return (data.values ?? []).map((v: Record<string, string>) => ({
      datetime: v.datetime,
      value: parseFloat(v[indicator]),
    }));
  } catch {
    return [];
  }
}
