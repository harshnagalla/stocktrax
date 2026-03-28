import { marketEndpoints, tickerEndpoints } from "./endpoints";
import type {
  FMPQuote,
  FMPSectorPerformance,
  FMPMarketMover,
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
}

export function createFMPClient(apiKey: string): FMPClient {
  let requestCount = 0;
  const cache = new Map<string, CacheEntry>();

  async function fetchJSON<T>(
    url: string,
    cacheKey: string,
    ttl: number = DEFAULT_TTL
  ): Promise<T | null> {
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    // Fetch from API
    requestCount++;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`FMP error [${cacheKey}]: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = await res.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    } catch (err) {
      console.error(`FMP fetch failed [${cacheKey}]:`, err);
      return null;
    }
  }

  // Helper: extract first item from array response, or null
  function first<T>(data: T[] | null): T | null {
    if (!data || data.length === 0) return null;
    return data[0];
  }

  // Helper: extract historical array from response
  function extractHistorical(
    data: FMPHistoricalResponse | null
  ): FMPHistoricalPrice[] {
    return data?.historical ?? [];
  }

  async function fetchMarketData(): Promise<MarketData> {
    const ep = marketEndpoints(apiKey);

    const results = await Promise.allSettled([
      fetchJSON<FMPQuote[]>(ep.sp500, "market:sp500"),
      fetchJSON<FMPQuote[]>(ep.nasdaq, "market:nasdaq"),
      fetchJSON<FMPQuote[]>(ep.dowJones, "market:dowJones"),
      fetchJSON<FMPQuote[]>(ep.russell, "market:russell"),
      fetchJSON<FMPQuote[]>(ep.vix, "market:vix"),
      fetchJSON<FMPQuote[]>(ep.treasury, "market:treasury"),
      fetchJSON<FMPSectorPerformance[]>(ep.sectors, "market:sectors"),
      fetchJSON<FMPMarketMover[]>(ep.gainers, "market:gainers"),
      fetchJSON<FMPMarketMover[]>(ep.losers, "market:losers"),
      fetchJSON<FMPMarketMover[]>(ep.actives, "market:actives"),
      fetchJSON<FMPEconomicEvent[]>(ep.econCalendar, "market:econCalendar"),
      fetchJSON<FMPTreasuryRate[]>(ep.treasuryRates, "market:treasuryRates"),
      fetchJSON<FMPHistoricalResponse>(ep.spxHistory, "market:spxHistory"),
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxSma50, "market:spxSma50"),
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxSma150, "market:spxSma150"),
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxSma200, "market:spxSma200"),
      fetchJSON<FMPTechnicalIndicator[]>(ep.spxRsi, "market:spxRsi"),
    ]);

    // Extract values from settled promises (null on rejection)
    const v = results.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );

    return {
      sp500: first(v[0] as FMPQuote[] | null),
      nasdaq: first(v[1] as FMPQuote[] | null),
      dowJones: first(v[2] as FMPQuote[] | null),
      russell: first(v[3] as FMPQuote[] | null),
      vix: first(v[4] as FMPQuote[] | null),
      treasury: first(v[5] as FMPQuote[] | null),
      sectors: (v[6] as FMPSectorPerformance[] | null) ?? [],
      gainers: (v[7] as FMPMarketMover[] | null) ?? [],
      losers: (v[8] as FMPMarketMover[] | null) ?? [],
      actives: (v[9] as FMPMarketMover[] | null) ?? [],
      econCalendar: (v[10] as FMPEconomicEvent[] | null) ?? [],
      treasuryRates: first(v[11] as FMPTreasuryRate[] | null),
      spxHistory: extractHistorical(v[12] as FMPHistoricalResponse | null),
      spxSma50: (v[13] as FMPTechnicalIndicator[] | null) ?? [],
      spxSma150: (v[14] as FMPTechnicalIndicator[] | null) ?? [],
      spxSma200: (v[15] as FMPTechnicalIndicator[] | null) ?? [],
      spxRsi: (v[16] as FMPTechnicalIndicator[] | null) ?? [],
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
      fetchJSON<FMPRecommendation[]>(ep.recommendations, `${ticker}:recommendations`),
      fetchJSON<FMPHistoricalResponse>(ep.history, `${ticker}:history`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.ema20, `${ticker}:ema20`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.sma50, `${ticker}:sma50`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.sma150, `${ticker}:sma150`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.sma200, `${ticker}:sma200`),
      fetchJSON<FMPTechnicalIndicator[]>(ep.rsi, `${ticker}:rsi`),
      fetchJSON<FMPSectorPE[]>(ep.sectorPE, `${ticker}:sectorPE`),
    ]);

    const v = results.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );

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

  return {
    getRequestCount: () => requestCount,
    resetRequestCount: () => {
      requestCount = 0;
    },
    clearCache: () => {
      cache.clear();
    },
    fetchMarketData,
    fetchTickerData,
  };
}
