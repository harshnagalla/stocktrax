import type { FMPClient } from "../fmp/client";
import type {
  FMPQuote,
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
  FMPHistoricalPrice,
  FMPSectorPerformance,
  FMPEconomicEvent,
  FMPTreasuryRate,
  FMPSectorPE,
  MarketData,
  TickerData,
} from "../fmp/types";
import { yahooHeaders, yahooMarketEndpoints, yahooTickerEndpoints } from "./endpoints";
import { computeSMA, computeEMA, computeRSI } from "./indicators";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const TTL = 5 * 60 * 1000;

export function createYahooClient(apiKey: string): FMPClient {
  let requestCount = 0;
  const cache = new Map<string, CacheEntry>();
  const headers = yahooHeaders(apiKey);

  async function fetchJSON<T>(url: string, cacheKey: string): Promise<T | null> {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.data as T;
    }

    requestCount++;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error(`Yahoo [${cacheKey}]: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = await res.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    } catch (err) {
      console.error(`Yahoo fetch failed [${cacheKey}]:`, err);
      return null;
    }
  }

  // ─── Response Mappers ────────────────────────────────────────

  function mapQuote(yq: YahooQuoteItem): FMPQuote {
    return {
      symbol: yq.symbol ?? "",
      name: yq.longName ?? yq.shortName ?? null,
      price: yq.regularMarketPrice ?? null,
      change: yq.regularMarketChange ?? null,
      changesPercentage: yq.regularMarketChangePercent ?? null,
      dayLow: yq.regularMarketDayLow ?? null,
      dayHigh: yq.regularMarketDayHigh ?? null,
      yearLow: yq.fiftyTwoWeekLow ?? null,
      yearHigh: yq.fiftyTwoWeekHigh ?? null,
      volume: yq.regularMarketVolume ?? null,
      avgVolume: yq.averageDailyVolume3Month ?? null,
      open: yq.regularMarketOpen ?? null,
      previousClose: yq.regularMarketPreviousClose ?? null,
      marketCap: yq.marketCap ?? null,
      eps: yq.epsTrailingTwelveMonths ?? null,
      pe: yq.trailingPE ?? null,
      priceAvg50: yq.fiftyDayAverage ?? null,
      priceAvg200: yq.twoHundredDayAverage ?? null,
      timestamp: yq.regularMarketTime ?? null,
    };
  }

  function mapProfile(yq: YahooQuoteItem, assetProfile: YahooAssetProfile | null): FMPProfile {
    return {
      symbol: yq.symbol ?? "",
      companyName: yq.longName ?? yq.shortName ?? "",
      price: yq.regularMarketPrice ?? null,
      mktCap: yq.marketCap ?? null,
      beta: assetProfile?.beta ?? null,
      sector: assetProfile?.sector ?? yq.sector ?? null,
      industry: assetProfile?.industry ?? yq.industry ?? null,
      range: yq.fiftyTwoWeekLow != null && yq.fiftyTwoWeekHigh != null
        ? `${yq.fiftyTwoWeekLow}-${yq.fiftyTwoWeekHigh}` : null,
      image: null,
      exchange: yq.exchange ?? null,
      exchangeShortName: yq.exchangeDisp ?? null,
      currency: yq.currency ?? null,
      description: assetProfile?.longBusinessSummary ?? null,
      country: assetProfile?.country ?? null,
      isEtf: yq.quoteType === "ETF",
      isActivelyTrading: true,
    };
  }

  function mapHistory(yahooHistory: YahooHistoryResponse | null): FMPHistoricalPrice[] {
    if (!yahooHistory?.body) return [];

    // Yahoo returns object keyed by timestamp or array
    const entries = Object.values(yahooHistory.body);
    const mapped: FMPHistoricalPrice[] = [];

    for (const entry of entries) {
      if (typeof entry !== "object" || !entry) continue;
      const e = entry as YahooHistoryItem;
      if (!e.date_utc || e.close == null) continue;
      mapped.push({
        date: typeof e.date_utc === "number"
          ? new Date(e.date_utc * 1000).toISOString().split("T")[0]
          : String(e.date_utc),
        open: e.open ?? 0,
        high: e.high ?? 0,
        low: e.low ?? 0,
        close: e.close,
        volume: e.volume ?? 0,
      });
    }

    // Sort newest first
    mapped.sort((a, b) => b.date.localeCompare(a.date));
    return mapped;
  }

  function extractVal(obj: unknown): number | null {
    if (obj == null) return null;
    if (typeof obj === "number") return obj;
    if (typeof obj === "object" && "raw" in (obj as Record<string, unknown>)) {
      return ((obj as Record<string, unknown>).raw as number) ?? null;
    }
    return null;
  }

  function mapKeyMetrics(fd: YahooFinancialData | null, ks: YahooKeyStatistics | null): FMPKeyMetrics {
    return {
      peRatioTTM: extractVal(ks?.trailingPE),
      pegRatioTTM: extractVal(ks?.pegRatio),
      priceToSalesRatioTTM: extractVal(ks?.priceToSalesTrailing12Months),
      enterpriseValueOverEBITDATTM: extractVal(ks?.enterpriseToEbitda),
      roeTTM: extractVal(fd?.returnOnEquity),
      roicTTM: null, // Yahoo doesn't provide ROIC directly
      freeCashFlowYieldTTM: extractVal(fd?.freeCashflow) != null && extractVal(fd?.marketCap) != null
        ? +(extractVal(fd?.freeCashflow)! / extractVal(fd?.marketCap)!).toFixed(4) : null,
      debtToEquityTTM: extractVal(fd?.debtToEquity) != null
        ? +(extractVal(fd?.debtToEquity)! / 100).toFixed(4) : null, // Yahoo returns as percentage
      currentRatioTTM: extractVal(fd?.currentRatio),
      netIncomePerShareTTM: extractVal(fd?.earningsGrowth), // approx
      revenuePerShareTTM: extractVal(fd?.revenuePerShare),
      freeCashFlowPerShareTTM: null,
      bookValuePerShareTTM: extractVal(ks?.bookValue),
      dividendYieldTTM: extractVal(ks?.lastDividendValue),
      marketCapTTM: extractVal(fd?.marketCap),
    };
  }

  function mapRatios(fd: YahooFinancialData | null, ks: YahooKeyStatistics | null): FMPRatios {
    return {
      operatingProfitMarginTTM: extractVal(fd?.operatingMargins),
      netProfitMarginTTM: extractVal(fd?.profitMargins),
      grossProfitMarginTTM: extractVal(fd?.grossMargins),
      returnOnEquityTTM: extractVal(fd?.returnOnEquity),
      returnOnAssetsTTM: extractVal(fd?.returnOnAssets),
      currentRatioTTM: extractVal(fd?.currentRatio),
      quickRatioTTM: extractVal(fd?.quickRatio),
      debtEquityRatioTTM: extractVal(fd?.debtToEquity) != null
        ? +(extractVal(fd?.debtToEquity)! / 100).toFixed(4) : null,
      debtRatioTTM: null,
      priceEarningsRatioTTM: extractVal(ks?.trailingPE),
      priceToBookRatioTTM: extractVal(ks?.priceToBook),
      priceToSalesRatioTTM: extractVal(ks?.priceToSalesTrailing12Months),
      dividendYielTTM: extractVal(ks?.lastDividendValue),
      payoutRatioTTM: extractVal(ks?.payoutRatio),
    };
  }

  function mapGrowth(fd: YahooFinancialData | null): FMPGrowth[] {
    // Yahoo provides limited growth in financial-data
    const revGrowth = extractVal(fd?.revenueGrowth);
    const epsGrowth = extractVal(fd?.earningsGrowth);
    if (revGrowth == null && epsGrowth == null) return [];
    return [{
      date: new Date().toISOString().split("T")[0],
      symbol: "",
      revenueGrowth: revGrowth,
      grossProfitGrowth: null,
      operatingIncomeGrowth: null,
      netIncomeGrowth: epsGrowth,
      epsgrowth: epsGrowth,
      epsdilutedGrowth: epsGrowth,
      freeCashFlowGrowth: null,
      operatingCashFlowGrowth: null,
    }];
  }

  function mapRecommendations(rec: YahooRecommendationTrend | null): FMPRecommendation | null {
    if (!rec?.trend?.length) return null;
    const latest = rec.trend[0]; // most recent period
    return {
      symbol: "",
      date: latest.period ?? "",
      analystRatingsStrongBuy: latest.strongBuy ?? 0,
      analystRatingsBuy: latest.buy ?? 0,
      analystRatingsHold: latest.hold ?? 0,
      analystRatingsSell: latest.sell ?? 0,
      analystRatingsStrongSell: latest.strongSell ?? 0,
      analystRatingsbuySummary: (latest.strongBuy ?? 0) + (latest.buy ?? 0),
    };
  }

  // ─── Main Fetch Methods ──────────────────────────────────────

  async function fetchMarketData(): Promise<MarketData> {
    const ep = yahooMarketEndpoints();

    const [quotesResult, spxHistResult] = await Promise.allSettled([
      fetchJSON<YahooQuotesResponse>(ep.quotes("VOO,QQQ,VTWO,%5EVIX,%5ETNX"), "mkt:quotes"),
      fetchJSON<YahooHistoryResponse>(ep.spxHistory, "mkt:spxH"),
    ]);

    const quotesData = quotesResult.status === "fulfilled" ? quotesResult.value : null;
    const spxHistData = spxHistResult.status === "fulfilled" ? spxHistResult.value : null;

    const quotes = quotesData?.body ?? [];
    const findQ = (sym: string) => {
      const q = quotes.find((q: YahooQuoteItem) =>
        q.symbol === sym || q.symbol === sym.replace("^", "")
      );
      return q ? mapQuote(q) : null;
    };

    const spxHistory = mapHistory(spxHistData);

    // Compute technical indicators from SPX history
    const spxSma50 = computeSMA(spxHistory, 50);
    const spxSma150 = computeSMA(spxHistory, 150);
    const spxSma200 = computeSMA(spxHistory, 200);
    const spxRsi = computeRSI(spxHistory);

    // Yahoo doesn't provide sector performance or economic calendar directly
    // Use empty arrays — the UI handles missing data gracefully
    const sectors: FMPSectorPerformance[] = [];
    const econCalendar: FMPEconomicEvent[] = [];
    const treasuryRates: FMPTreasuryRate | null = null;

    return {
      voo: findQ("VOO"),
      qqq: findQ("QQQ"),
      vtwo: findQ("VTWO"),
      vix: findQ("^VIX"),
      treasury: findQ("^TNX"),
      sectors,
      econCalendar,
      treasuryRates,
      spxHistory,
      spxSma50,
      spxSma150,
      spxSma200,
      spxRsi,
    };
  }

  async function fetchTickerData(ticker: string): Promise<TickerData> {
    const ep = yahooTickerEndpoints(ticker);

    const results = await Promise.allSettled([
      fetchJSON<YahooQuotesResponse>(ep.quote, `${ticker}:quote`),
      fetchJSON<YahooHistoryResponse>(ep.history, `${ticker}:history`),
      fetchJSON<YahooModuleResponse>(ep.financialData, `${ticker}:fd`),
      fetchJSON<YahooModuleResponse>(ep.assetProfile, `${ticker}:ap`),
      fetchJSON<YahooModuleResponse>(ep.keyStatistics, `${ticker}:ks`),
      fetchJSON<YahooModuleResponse>(ep.incomeStatement, `${ticker}:is`),
      fetchJSON<YahooModuleResponse>(ep.balanceSheet, `${ticker}:bs`),
      fetchJSON<YahooModuleResponse>(ep.cashflowStatement, `${ticker}:cf`),
      fetchJSON<YahooModuleResponse>(ep.recommendationTrend, `${ticker}:rec`),
    ]);

    const v = results.map((r) => r.status === "fulfilled" ? r.value : null);

    const quotesResp = v[0] as YahooQuotesResponse | null;
    const histResp = v[1] as YahooHistoryResponse | null;
    const fdResp = v[2] as YahooModuleResponse | null;
    const apResp = v[3] as YahooModuleResponse | null;
    const ksResp = v[4] as YahooModuleResponse | null;
    const _isResp = v[5] as YahooModuleResponse | null;
    const _bsResp = v[6] as YahooModuleResponse | null;
    const _cfResp = v[7] as YahooModuleResponse | null;
    const recResp = v[8] as YahooModuleResponse | null;

    const yq = quotesResp?.body?.[0] ?? ({} as YahooQuoteItem);
    const fd = fdResp?.body?.financialData ?? null;
    const ap = apResp?.body?.assetProfile ?? null;
    const ks = ksResp?.body?.defaultKeyStatistics ?? null;
    const rec = recResp?.body?.recommendationTrend ?? null;

    const history = mapHistory(histResp);
    const quote = mapQuote(yq);
    const profile = mapProfile(yq, ap);

    // Compute technical indicators from history
    const sma50 = computeSMA(history, 50);
    const sma150 = computeSMA(history, 150);
    const sma200 = computeSMA(history, 200);
    const ema20 = computeEMA(history, 20);
    const rsi = computeRSI(history);

    // DCF estimate: use target price as proxy
    const targetPrice = extractVal(fd?.targetMeanPrice);
    const currentPrice = yq.regularMarketPrice ?? null;
    const dcf: FMPDCF | null = targetPrice != null && currentPrice != null
      ? { symbol: ticker, date: new Date().toISOString().split("T")[0], dcf: targetPrice, price: currentPrice }
      : null;

    // Estimates from financial-data
    const estimates: FMPEstimate | null = fd ? {
      symbol: ticker,
      date: new Date().toISOString().split("T")[0],
      estimatedRevenueAvg: extractVal(fd.totalRevenue),
      estimatedRevenueHigh: null,
      estimatedRevenueLow: null,
      estimatedEpsAvg: extractVal(fd.targetMeanPrice) != null && quote.pe != null
        ? +(extractVal(fd.targetMeanPrice)! / quote.pe).toFixed(2) : null,
      estimatedEpsHigh: null,
      estimatedEpsLow: null,
      numberAnalystEstimatedRevenue: extractVal(fd.numberOfAnalystOpinions),
      numberAnalystsEstimatedEps: extractVal(fd.numberOfAnalystOpinions),
    } : null;

    // Sector PE — not available from Yahoo directly
    const sectorPE: FMPSectorPE[] = [];

    return {
      ticker,
      profile,
      quote,
      keyMetrics: mapKeyMetrics(fd, ks),
      ratios: mapRatios(fd, ks),
      growth: mapGrowth(fd),
      income: [],    // Yahoo modules return nested structures; left empty for now
      cashflow: [],
      balance: null,
      dcf,
      estimates,
      recommendations: mapRecommendations(rec),
      history,
      ema20,
      sma50,
      sma150,
      sma200,
      rsi,
      sectorPE,
    };
  }

  async function fetchBatchQuotes(tickers: string[]): Promise<FMPQuote[]> {
    const ep = yahooMarketEndpoints();
    const data = await fetchJSON<YahooQuotesResponse>(
      ep.quotes(tickers.join(",")),
      `batch:${tickers.join(",")}`
    );
    if (!data?.body) return [];
    return data.body.map(mapQuote);
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

// ─── Yahoo Response Types ───────────────────────────────────────
// These are loose types matching Yahoo Finance API response shapes.

interface YahooQuoteItem {
  symbol?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  regularMarketTime?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  epsTrailingTwelveMonths?: number;
  exchange?: string;
  exchangeDisp?: string;
  currency?: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
}

interface YahooQuotesResponse {
  body?: YahooQuoteItem[];
}

interface YahooHistoryItem {
  date_utc?: number | string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

interface YahooHistoryResponse {
  body?: Record<string, unknown>;
}

interface YahooAssetProfile {
  sector?: string;
  industry?: string;
  country?: string;
  longBusinessSummary?: string;
  beta?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface YahooFinancialData {
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface YahooKeyStatistics {
  [key: string]: any;
}

interface YahooRecommendationTrend {
  trend?: {
    period?: string;
    strongBuy?: number;
    buy?: number;
    hold?: number;
    sell?: number;
    strongSell?: number;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface YahooModuleResponse {
  body?: Record<string, any>;
}
