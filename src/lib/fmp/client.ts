import { marketEndpoints, tickerEndpoints } from "./endpoints";
import type {
  FMPQuote,
  FMPSectorPerformance,
  FMPEconomicEvent,
  FMPTreasuryRate,
  FMPHistoricalResponse,
  FMPHistoricalPrice,
  FMPTechnicalIndicator,
  FMPProfile,
  FMPKeyMetrics,
  FMPRatios,
  FMPGrowth,
  FMPIncomeStatement,
  FMPCashFlow,
  FMPBalanceSheet,
  FMPDCF,
  FMPEstimate,
  FMPRecommendation,
  FMPSectorPE,
  MarketData,
  TickerData,
} from "./types";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export interface FMPClient {
  getRequestCount: () => number;
  resetRequestCount: () => void;
  clearCache: () => void;
  fetchMarketData: () => Promise<MarketData>;
  fetchTickerData: (ticker: string) => Promise<TickerData>;
  fetchBatchQuotes: (tickers: string[]) => Promise<FMPQuote[]>;
}

export function createFMPClient(apiKey: string): FMPClient {
  let requestCount = 0;
  const cache = new Map<string, CacheEntry>();

  async function fetchJSON<T>(
    url: string,
    cacheKey: string,
    ttl: number = DEFAULT_TTL
  ): Promise<T | null> {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    requestCount++;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`FMP [${cacheKey}]: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = await res.json();
      // FMP returns {"Error Message": "..."} for invalid keys
      if (data && typeof data === "object" && "Error Message" in data) {
        console.error(`FMP [${cacheKey}]:`, data["Error Message"]);
        return null;
      }
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    } catch (err) {
      console.error(`FMP fetch failed [${cacheKey}]:`, err);
      return null;
    }
  }

  function first<T>(data: T[] | null): T | null {
    if (!data || data.length === 0) return null;
    return data[0];
  }

  function findQuote(quotes: FMPQuote[] | null, symbol: string): FMPQuote | null {
    if (!quotes) return null;
    return quotes.find((q) => q.symbol === symbol) ?? null;
  }

  function extractHistorical(data: FMPHistoricalResponse | null): FMPHistoricalPrice[] {
    return data?.historical ?? [];
  }

  async function fetchMarketData(): Promise<MarketData> {
    const ep = marketEndpoints(apiKey);

    // Batch: VOO, QQQ, VTWO in 1 call. VIX + TNX separate (index symbols).
    // Total: ~11 calls instead of ~17
    const results = await Promise.allSettled([
      fetchJSON<FMPQuote[]>(ep.batchQuotes, "market:batch"),          // 0
      fetchJSON<FMPQuote[]>(ep.vix, "market:vix"),                     // 1
      fetchJSON<FMPQuote[]>(ep.treasury, "market:treasury"),           // 2
      fetchJSON<FMPSectorPerformance[]>(ep.sectors, "market:sectors"), // 3
      fetchJSON<FMPEconomicEvent[]>(ep.econCalendar, "market:econ"),   // 4
      fetchJSON<FMPTreasuryRate[]>(ep.treasuryRates, "market:rates"),  // 5
      fetchJSON<FMPHistoricalResponse>(ep.spxHistory, "market:spxH"),  // 6
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxSma50, "market:s50"),   // 7
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxSma150, "market:s150"), // 8
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxSma200, "market:s200"), // 9
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxRsi, "market:rsi"),     // 10
    ]);

    const v = results.map((r) => (r.status === "fulfilled" ? r.value : null));

    const batchQuotes = v[0] as FMPQuote[] | null;

    return {
      voo: findQuote(batchQuotes, "VOO"),
      qqq: findQuote(batchQuotes, "QQQ"),
      vtwo: findQuote(batchQuotes, "VTWO"),
      vix: first(v[1] as FMPQuote[] | null),
      treasury: first(v[2] as FMPQuote[] | null),
      sectors: (v[3] as FMPSectorPerformance[] | null) ?? [],
      econCalendar: (v[4] as FMPEconomicEvent[] | null) ?? [],
      treasuryRates: first(v[5] as FMPTreasuryRate[] | null),
      spxHistory: extractHistorical(v[6] as FMPHistoricalResponse | null),
      spxSma50: (v[7] as FMPTechnicalIndicator[] | null) ?? [],
      spxSma150: (v[8] as FMPTechnicalIndicator[] | null) ?? [],
      spxSma200: (v[9] as FMPTechnicalIndicator[] | null) ?? [],
      spxRsi: (v[10] as FMPTechnicalIndicator[] | null) ?? [],
    };
  }

  async function fetchTickerData(ticker: string): Promise<TickerData> {
    const ep = tickerEndpoints(ticker, apiKey);

    const results = await Promise.allSettled([
      fetchJSON<FMPProfile[]>(ep.profile, `${ticker}:profile`),
      fetchJSON<FMPQuote[]>(ep.quote, `${ticker}:quote`),
      fetchJSON<FMPKeyMetrics[]>(ep.keyMetrics, `${ticker}:keyMetrics`),
      fetchJSON<FMPRatios[]>(ep.ratios, `${ticker}:ratios`),
      fetchJSON<FMPGrowth[]>(ep.growth, `${ticker}:growth`),
      fetchJSON<FMPIncomeStatement[]>(ep.income, `${ticker}:income`),
      fetchJSON<FMPCashFlow[]>(ep.cashflow, `${ticker}:cashflow`),
      fetchJSON<FMPBalanceSheet[]>(ep.balance, `${ticker}:balance`),
      fetchJSON<FMPDCF[]>(ep.dcf, `${ticker}:dcf`),
      fetchJSON<FMPEstimate[]>(ep.estimates, `${ticker}:estimates`),
      fetchJSON<FMPRecommendation[]>(ep.recommendations, `${ticker}:recs`),
      fetchJSON<FMPHistoricalResponse>(ep.history, `${ticker}:history`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.ema20, `${ticker}:ema20`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.sma50, `${ticker}:sma50`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.sma150, `${ticker}:sma150`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.sma200, `${ticker}:sma200`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.rsi, `${ticker}:rsi`),
      fetchJSON<FMPSectorPE[]>(ep.sectorPE, `${ticker}:sectorPE`),
    ]);

    const v = results.map((r) => (r.status === "fulfilled" ? r.value : null));

    return {
      ticker,
      profile: first(v[0] as FMPProfile[] | null),
      quote: first(v[1] as FMPQuote[] | null),
      keyMetrics: first(v[2] as FMPKeyMetrics[] | null),
      ratios: first(v[3] as FMPRatios[] | null),
      growth: (v[4] as FMPGrowth[] | null) ?? [],
      income: (v[5] as FMPIncomeStatement[] | null) ?? [],
      cashflow: (v[6] as FMPCashFlow[] | null) ?? [],
      balance: first(v[7] as FMPBalanceSheet[] | null),
      dcf: first(v[8] as FMPDCF[] | null),
      estimates: first(v[9] as FMPEstimate[] | null),
      recommendations: first(v[10] as FMPRecommendation[] | null),
      history: extractHistorical(v[11] as FMPHistoricalResponse | null),
      ema20: (v[12] as FMPTechnicalIndicator[] | null) ?? [],
      sma50: (v[13] as FMPTechnicalIndicator[] | null) ?? [],
      sma150: (v[14] as FMPTechnicalIndicator[] | null) ?? [],
      sma200: (v[15] as FMPTechnicalIndicator[] | null) ?? [],
      rsi: (v[16] as FMPTechnicalIndicator[] | null) ?? [],
      sectorPE: (v[17] as FMPSectorPE[] | null) ?? [],
    };
  }

  async function fetchBatchQuotes(tickers: string[]): Promise<FMPQuote[]> {
    const url = `https://financialmodelingprep.com/stable/quote?symbol=${tickers.join(",")}&apikey=${apiKey}`;
    const data = await fetchJSON<FMPQuote[]>(url, `batch:${tickers.join(",")}`);
    return data ?? [];
  }

  return {
    getRequestCount: () => requestCount,
    resetRequestCount: () => { requestCount = 0; },
    clearCache: () => { cache.clear(); },
    fetchMarketData,
    fetchTickerData,
    fetchBatchQuotes,
  };
}
