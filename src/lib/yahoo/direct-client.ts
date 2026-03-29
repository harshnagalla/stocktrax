import type { FMPClient } from "../fmp/client";
import type {
  FMPQuote,
  FMPProfile,
  FMPKeyMetrics,
  FMPRatios,
  FMPGrowth,
  FMPIncomeStatement,
  FMPCashFlow,
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
import { computeSMA, computeEMA, computeRSI } from "./indicators";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const TTL = 5 * 60 * 1000;
const PROXY = "/api/yahoo";

/**
 * Yahoo Finance Direct client — no API key needed.
 * Uses Next.js API route as proxy to avoid CORS.
 */
export function createYahooDirectClient(): FMPClient {
  let requestCount = 0;
  const cache = new Map<string, CacheEntry>();

  async function fetchProxy<T>(url: string, cacheKey: string): Promise<T | null> {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.data as T;
    }

    requestCount++;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Yahoo Direct [${cacheKey}]: ${res.status}`);
        return null;
      }
      const data = await res.json();
      if (data.error) {
        console.error(`Yahoo Direct [${cacheKey}]:`, data.error);
        return null;
      }
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    } catch (err) {
      console.error(`Yahoo Direct fetch failed [${cacheKey}]:`, err);
      return null;
    }
  }

  // ─── Quote Mapping ────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapQuote(yq: any): FMPQuote {
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

  // ─── Chart → Historical Prices ────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapChart(chartData: any): FMPHistoricalPrice[] {
    const result = chartData?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0];
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose;
    if (!ohlcv) return [];

    const history: FMPHistoricalPrice[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = ohlcv.close?.[i];
      if (close == null) continue;
      history.push({
        date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
        open: ohlcv.open?.[i] ?? close,
        high: ohlcv.high?.[i] ?? close,
        low: ohlcv.low?.[i] ?? close,
        close,
        volume: ohlcv.volume?.[i] ?? 0,
        adjClose: adjClose?.[i] ?? close,
      });
    }

    // Sort newest-first
    history.sort((a, b) => b.date.localeCompare(a.date));
    return history;
  }

  // ─── Module Mappers ───────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function val(obj: any): number | null {
    if (obj == null) return null;
    if (typeof obj === "number") return obj;
    if (typeof obj === "object" && "raw" in obj) return obj.raw ?? null;
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapProfile(yq: any, ap: any): FMPProfile {
    return {
      symbol: yq.symbol ?? "",
      companyName: yq.longName ?? yq.shortName ?? "",
      price: yq.regularMarketPrice ?? null,
      mktCap: yq.marketCap ?? null,
      beta: val(ap?.beta),
      sector: ap?.sector ?? null,
      industry: ap?.industry ?? null,
      range: yq.fiftyTwoWeekLow != null && yq.fiftyTwoWeekHigh != null
        ? `${yq.fiftyTwoWeekLow}-${yq.fiftyTwoWeekHigh}` : null,
      image: null,
      exchange: yq.exchange ?? null,
      exchangeShortName: yq.exchangeDisp ?? null,
      currency: yq.currency ?? null,
      description: ap?.longBusinessSummary ?? null,
      country: ap?.country ?? null,
      isEtf: yq.quoteType === "ETF",
      isActivelyTrading: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapKeyMetrics(fd: any, ks: any): FMPKeyMetrics {
    const fcf = val(fd?.freeCashflow);
    const mktCap = val(fd?.marketCap);
    return {
      peRatioTTM: val(ks?.trailingPE),
      pegRatioTTM: val(ks?.pegRatio),
      priceToSalesRatioTTM: val(ks?.priceToSalesTrailing12Months),
      enterpriseValueOverEBITDATTM: val(ks?.enterpriseToEbitda),
      roeTTM: val(fd?.returnOnEquity),
      roicTTM: null,
      freeCashFlowYieldTTM: fcf != null && mktCap != null && mktCap > 0
        ? +(fcf / mktCap).toFixed(4) : null,
      debtToEquityTTM: val(fd?.debtToEquity) != null
        ? +(val(fd?.debtToEquity)! / 100).toFixed(4) : null,
      currentRatioTTM: val(fd?.currentRatio),
      netIncomePerShareTTM: null,
      revenuePerShareTTM: val(fd?.revenuePerShare),
      freeCashFlowPerShareTTM: null,
      bookValuePerShareTTM: val(ks?.bookValue),
      dividendYieldTTM: val(ks?.lastDividendValue),
      marketCapTTM: mktCap,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRatios(fd: any, ks: any): FMPRatios {
    return {
      operatingProfitMarginTTM: val(fd?.operatingMargins),
      netProfitMarginTTM: val(fd?.profitMargins),
      grossProfitMarginTTM: val(fd?.grossMargins),
      returnOnEquityTTM: val(fd?.returnOnEquity),
      returnOnAssetsTTM: val(fd?.returnOnAssets),
      currentRatioTTM: val(fd?.currentRatio),
      quickRatioTTM: val(fd?.quickRatio),
      debtEquityRatioTTM: val(fd?.debtToEquity) != null
        ? +(val(fd?.debtToEquity)! / 100).toFixed(4) : null,
      debtRatioTTM: null,
      priceEarningsRatioTTM: val(ks?.trailingPE),
      priceToBookRatioTTM: val(ks?.priceToBook),
      priceToSalesRatioTTM: val(ks?.priceToSalesTrailing12Months),
      dividendYielTTM: val(ks?.lastDividendValue),
      payoutRatioTTM: val(ks?.payoutRatio),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapGrowth(fd: any): FMPGrowth[] {
    const revGrowth = val(fd?.revenueGrowth);
    const epsGrowth = val(fd?.earningsGrowth);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapIncomeStatements(data: any): FMPIncomeStatement[] {
    const stmts = data?.incomeStatementHistory?.incomeStatementHistory
      ?? data?.incomeStatementHistoryQuarterly?.incomeStatementHistory
      ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stmts.slice(0, 5).map((s: any) => ({
      date: s.endDate?.fmt ?? "",
      symbol: "",
      revenue: val(s.totalRevenue),
      grossProfit: val(s.grossProfit),
      operatingIncome: val(s.operatingIncome),
      netIncome: val(s.netIncome),
      eps: val(s.dilutedEPS),
      epsdiluted: val(s.dilutedEPS),
      operatingExpenses: val(s.totalOperatingExpenses),
      costOfRevenue: val(s.costOfRevenue),
      sellingGeneralAndAdministrativeExpenses: val(s.sellingGeneralAdministrative),
      researchAndDevelopmentExpenses: val(s.researchDevelopment),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapCashflow(data: any): FMPCashFlow[] {
    const stmts = data?.cashflowStatementHistory?.cashflowStatements ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stmts.slice(0, 5).map((s: any) => ({
      date: s.endDate?.fmt ?? "",
      symbol: "",
      operatingCashFlow: val(s.totalCashFromOperatingActivities),
      capitalExpenditure: val(s.capitalExpenditures),
      freeCashFlow: val(s.totalCashFromOperatingActivities) != null && val(s.capitalExpenditures) != null
        ? val(s.totalCashFromOperatingActivities)! + val(s.capitalExpenditures)! : null,
      dividendsPaid: val(s.dividendsPaid),
      netCashProvidedByOperatingActivities: val(s.totalCashFromOperatingActivities),
      netCashUsedForInvestingActivites: val(s.totalCashflowsFromInvestingActivities),
      netCashUsedProvidedByFinancingActivities: val(s.totalCashFromFinancingActivities),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRecommendations(data: any): FMPRecommendation | null {
    const trends = data?.recommendationTrend?.trend;
    if (!trends?.length) return null;
    const latest = trends[0];
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

  // ─── Main Methods ─────────────────────────────────────────────

  async function fetchMarketData(): Promise<MarketData> {
    const [quotesData, spxChart] = await Promise.all([
      fetchProxy<QuoteResponse>(
        `${PROXY}?type=quote&symbols=VOO,QQQ,VTWO,%5EVIX,%5ETNX`,
        "mkt:quotes"
      ),
      fetchProxy<ChartResponse>(
        `${PROXY}?type=chart&symbol=%5EGSPC&range=1y&interval=1d`,
        "mkt:spxChart"
      ),
    ]);

    const quotes = quotesData?.quoteResponse?.result ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findQ = (sym: string) => {
      const q = quotes.find((q: Record<string, unknown>) =>
        q.symbol === sym || q.symbol === sym.replace("^", "")
      );
      return q ? mapQuote(q) : null;
    };

    const spxHistory = mapChart(spxChart);
    const spxSma50 = computeSMA(spxHistory, 50);
    const spxSma150 = computeSMA(spxHistory, 150);
    const spxSma200 = computeSMA(spxHistory, 200);
    const spxRsi = computeRSI(spxHistory);

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
    const modules = [
      "assetProfile",
      "financialData",
      "defaultKeyStatistics",
      "recommendationTrend",
      "incomeStatementHistory",
      "cashflowStatementHistory",
    ].join(",");

    const [quotesData, chartData, summaryData] = await Promise.all([
      fetchProxy<QuoteResponse>(
        `${PROXY}?type=quote&symbols=${ticker}`,
        `${ticker}:quote`
      ),
      fetchProxy<ChartResponse>(
        `${PROXY}?type=chart&symbol=${ticker}&range=1y&interval=1d`,
        `${ticker}:chart`
      ),
      fetchProxy<SummaryResponse>(
        `${PROXY}?type=summary&symbol=${ticker}&modules=${modules}`,
        `${ticker}:summary`
      ),
    ]);

    const yq = quotesData?.quoteResponse?.result?.[0] ?? {};
    const summary = summaryData?.quoteSummary?.result?.[0] ?? {};

    const ap = summary.assetProfile ?? null;
    const fd = summary.financialData ?? null;
    const ks = summary.defaultKeyStatistics ?? null;

    const history = mapChart(chartData);
    const quote = mapQuote(yq);
    const profile = mapProfile(yq, ap);

    const sma50 = computeSMA(history, 50);
    const sma150 = computeSMA(history, 150);
    const sma200 = computeSMA(history, 200);
    const ema20 = computeEMA(history, 20);
    const rsi = computeRSI(history);

    const targetPrice = val(fd?.targetMeanPrice);
    const currentPrice = yq.regularMarketPrice ?? null;
    const dcf: FMPDCF | null = targetPrice != null && currentPrice != null
      ? { symbol: ticker, date: new Date().toISOString().split("T")[0], dcf: targetPrice, price: currentPrice }
      : null;

    const numAnalysts = val(fd?.numberOfAnalystOpinions);
    const estimates: FMPEstimate | null = fd ? {
      symbol: ticker,
      date: new Date().toISOString().split("T")[0],
      estimatedRevenueAvg: val(fd.totalRevenue),
      estimatedRevenueHigh: null,
      estimatedRevenueLow: null,
      estimatedEpsAvg: val(fd.targetMeanPrice) != null && quote.pe != null && quote.pe > 0
        ? +(val(fd.targetMeanPrice)! / quote.pe).toFixed(2) : null,
      estimatedEpsHigh: null,
      estimatedEpsLow: null,
      numberAnalystEstimatedRevenue: numAnalysts,
      numberAnalystsEstimatedEps: numAnalysts,
    } : null;

    const sectorPE: FMPSectorPE[] = [];

    return {
      ticker,
      profile,
      quote,
      keyMetrics: mapKeyMetrics(fd, ks),
      ratios: mapRatios(fd, ks),
      growth: mapGrowth(fd),
      income: mapIncomeStatements(summary),
      cashflow: mapCashflow(summary),
      balance: null,
      dcf,
      estimates,
      recommendations: mapRecommendations(summary),
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
    const data = await fetchProxy<QuoteResponse>(
      `${PROXY}?type=quote&symbols=${tickers.join(",")}`,
      `batch:${tickers.join(",")}`
    );
    if (!data?.quoteResponse?.result) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.quoteResponse.result.map((q: any) => mapQuote(q));
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

// ─── Response Types ─────────────────────────────────────────────

interface QuoteResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quoteResponse?: { result?: any[] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartResponse = any;

interface SummaryResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quoteSummary?: { result?: any[] };
}
