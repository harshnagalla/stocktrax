import type {
  MarketData,
  TickerData,
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
  FMPTechnicalIndicator,
  FMPSectorPerformance,
  FMPEconomicEvent,
  FMPTreasuryRate,
  FMPSectorPE,
} from "./fmp/types";

// ─── Helper: generate historical prices ──────────────────────────

function generateHistory(
  basePrice: number,
  days: number,
  volatility: number = 0.015
): FMPHistoricalPrice[] {
  const history: FMPHistoricalPrice[] = [];
  let price = basePrice * (1 - volatility * days * 0.3); // start lower in the past
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.45) * volatility * price;
    price = Math.max(price + change, price * 0.5);
    const dayVol = price * volatility;
    history.push({
      date: date.toISOString().split("T")[0],
      open: +(price - dayVol * 0.3).toFixed(2),
      high: +(price + dayVol * 0.5).toFixed(2),
      low: +(price - dayVol * 0.5).toFixed(2),
      close: +price.toFixed(2),
      volume: Math.floor(20_000_000 + Math.random() * 30_000_000),
    });
  }

  return history.reverse(); // newest first
}

function generateSMA(
  history: FMPHistoricalPrice[],
  period: number
): FMPTechnicalIndicator[] {
  const result: FMPTechnicalIndicator[] = [];
  for (let i = 0; i < history.length - period + 1; i++) {
    const slice = history.slice(i, i + period);
    const avg = slice.reduce((s, h) => s + h.close, 0) / period;
    result.push({ date: history[i].date, close: history[i].close, sma: +avg.toFixed(2) });
  }
  return result;
}

function generateEMA(
  history: FMPHistoricalPrice[],
  period: number
): FMPTechnicalIndicator[] {
  if (history.length < period) return [];
  const k = 2 / (period + 1);
  // start EMA from SMA of first `period` entries (oldest end)
  const reversed = [...history].reverse();
  const initialSlice = reversed.slice(0, period);
  let ema = initialSlice.reduce((s, h) => s + h.close, 0) / period;
  const emaValues: { date: string; close: number; ema: number }[] = [];

  for (let i = 0; i < reversed.length; i++) {
    if (i < period) {
      // no EMA for initial period
      continue;
    }
    ema = reversed[i].close * k + ema * (1 - k);
    emaValues.push({ date: reversed[i].date, close: reversed[i].close, ema: +ema.toFixed(2) });
  }

  return emaValues.reverse();
}

function generateRSI(history: FMPHistoricalPrice[]): FMPTechnicalIndicator[] {
  const result: FMPTechnicalIndicator[] = [];
  const period = 14;
  if (history.length < period + 1) return [];

  const reversed = [...history].reverse();
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = reversed[i].close - reversed[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < reversed.length; i++) {
    const diff = reversed[i].close - reversed[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = +(100 - 100 / (1 + rs)).toFixed(2);
    result.push({ date: reversed[i].date, close: reversed[i].close, rsi });
  }

  return result.reverse();
}

// ─── Stock Templates ────────────────────────────────────────────

interface StockTemplate {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  beta: number;
  pe: number;
  eps: number;
  yearLow: number;
  yearHigh: number;
  roe: number;
  roa: number;
  roic: number;
  operatingMargin: number;
  debtToEquity: number;
  pegRatio: number;
  fcfYield: number;
  revenueGrowth: number;
  epsGrowth: number;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

const STOCK_TEMPLATES: Record<string, StockTemplate> = {
  AAPL: {
    ticker: "AAPL", name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics",
    price: 178.72, change: 2.34, changePct: 1.33, marketCap: 2.78e12, beta: 1.28, pe: 28.5, eps: 6.27,
    yearLow: 142.0, yearHigh: 199.62, roe: 0.175, roa: 0.286, roic: 0.56,
    operatingMargin: 0.30, debtToEquity: 1.76, pegRatio: 2.1, fcfYield: 0.035,
    revenueGrowth: 0.02, epsGrowth: 0.08, strongBuy: 12, buy: 18, hold: 8, sell: 2, strongSell: 0,
  },
  MSFT: {
    ticker: "MSFT", name: "Microsoft Corporation", sector: "Technology", industry: "Software",
    price: 415.50, change: 5.12, changePct: 1.25, marketCap: 3.09e12, beta: 0.89, pe: 35.2, eps: 11.80,
    yearLow: 309.45, yearHigh: 430.82, roe: 0.38, roa: 0.19, roic: 0.28,
    operatingMargin: 0.44, debtToEquity: 0.35, pegRatio: 1.8, fcfYield: 0.028,
    revenueGrowth: 0.15, epsGrowth: 0.20, strongBuy: 20, buy: 15, hold: 3, sell: 0, strongSell: 0,
  },
  GOOGL: {
    ticker: "GOOGL", name: "Alphabet Inc.", sector: "Technology", industry: "Internet Content",
    price: 155.30, change: -1.20, changePct: -0.77, marketCap: 1.93e12, beta: 1.05, pe: 23.8, eps: 6.52,
    yearLow: 120.21, yearHigh: 164.50, roe: 0.29, roa: 0.18, roic: 0.24,
    operatingMargin: 0.32, debtToEquity: 0.10, pegRatio: 1.1, fcfYield: 0.045,
    revenueGrowth: 0.12, epsGrowth: 0.30, strongBuy: 18, buy: 20, hold: 5, sell: 1, strongSell: 0,
  },
  NVDA: {
    ticker: "NVDA", name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors",
    price: 875.30, change: 18.40, changePct: 2.15, marketCap: 2.16e12, beta: 1.68, pe: 65.2, eps: 13.43,
    yearLow: 390.0, yearHigh: 950.0, roe: 0.91, roa: 0.55, roic: 0.72,
    operatingMargin: 0.59, debtToEquity: 0.41, pegRatio: 0.9, fcfYield: 0.012,
    revenueGrowth: 1.22, epsGrowth: 4.86, strongBuy: 30, buy: 12, hold: 2, sell: 0, strongSell: 0,
  },
  AMZN: {
    ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", industry: "Internet Retail",
    price: 185.60, change: 3.25, changePct: 1.78, marketCap: 1.92e12, beta: 1.15, pe: 52.4, eps: 3.54,
    yearLow: 118.35, yearHigh: 192.70, roe: 0.22, roa: 0.07, roic: 0.13,
    operatingMargin: 0.08, debtToEquity: 0.58, pegRatio: 1.5, fcfYield: 0.02,
    revenueGrowth: 0.12, epsGrowth: 2.30, strongBuy: 25, buy: 15, hold: 3, sell: 0, strongSell: 0,
  },
  TSLA: {
    ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers",
    price: 245.20, change: -4.80, changePct: -1.92, marketCap: 780e9, beta: 2.05, pe: 72.0, eps: 3.41,
    yearLow: 138.80, yearHigh: 299.29, roe: 0.22, roa: 0.09, roic: 0.16,
    operatingMargin: 0.09, debtToEquity: 0.11, pegRatio: 3.2, fcfYield: 0.008,
    revenueGrowth: -0.03, epsGrowth: -0.40, strongBuy: 10, buy: 8, hold: 15, sell: 7, strongSell: 3,
  },
  META: {
    ticker: "META", name: "Meta Platforms Inc.", sector: "Technology", industry: "Internet Content",
    price: 510.20, change: 7.80, changePct: 1.55, marketCap: 1.30e12, beta: 1.22, pe: 28.9, eps: 17.65,
    yearLow: 280.0, yearHigh: 542.81, roe: 0.33, roa: 0.22, roic: 0.27,
    operatingMargin: 0.41, debtToEquity: 0.27, pegRatio: 1.3, fcfYield: 0.032,
    revenueGrowth: 0.23, epsGrowth: 0.73, strongBuy: 22, buy: 16, hold: 4, sell: 1, strongSell: 0,
  },
  JPM: {
    ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", industry: "Banks",
    price: 198.40, change: 1.10, changePct: 0.56, marketCap: 572e9, beta: 1.08, pe: 11.5, eps: 17.25,
    yearLow: 143.50, yearHigh: 205.88, roe: 0.17, roa: 0.013, roic: 0.04,
    operatingMargin: 0.39, debtToEquity: 1.32, pegRatio: 1.6, fcfYield: 0.06,
    revenueGrowth: 0.09, epsGrowth: 0.12, strongBuy: 10, buy: 12, hold: 6, sell: 1, strongSell: 0,
  },
};

// Generate a default template for unknown tickers
function defaultTemplate(ticker: string): StockTemplate {
  const price = 50 + Math.random() * 200;
  const change = (Math.random() - 0.5) * 6;
  return {
    ticker, name: `${ticker} Corp.`, sector: "Technology", industry: "Software",
    price: +price.toFixed(2), change: +change.toFixed(2), changePct: +((change / price) * 100).toFixed(2),
    marketCap: 50e9 + Math.random() * 500e9, beta: 0.8 + Math.random() * 0.8,
    pe: 15 + Math.random() * 30, eps: +(price / (15 + Math.random() * 30)).toFixed(2),
    yearLow: +(price * 0.7).toFixed(2), yearHigh: +(price * 1.3).toFixed(2),
    roe: 0.10 + Math.random() * 0.20, roa: 0.05 + Math.random() * 0.15, roic: 0.08 + Math.random() * 0.18,
    operatingMargin: 0.10 + Math.random() * 0.25, debtToEquity: 0.1 + Math.random() * 1.5,
    pegRatio: 0.5 + Math.random() * 2.5, fcfYield: 0.01 + Math.random() * 0.07,
    revenueGrowth: -0.05 + Math.random() * 0.30, epsGrowth: -0.10 + Math.random() * 0.50,
    strongBuy: Math.floor(Math.random() * 15), buy: Math.floor(Math.random() * 15),
    hold: Math.floor(Math.random() * 10), sell: Math.floor(Math.random() * 5),
    strongSell: Math.floor(Math.random() * 3),
  };
}

function buildTickerData(t: StockTemplate): TickerData {
  const history = generateHistory(t.price, 300);
  const sma50 = generateSMA(history, 50);
  const sma150 = generateSMA(history, 150);
  const sma200 = generateSMA(history, 200);
  const ema20 = generateEMA(history, 20);
  const rsi = generateRSI(history);

  const profile: FMPProfile = {
    symbol: t.ticker, companyName: t.name, price: t.price, mktCap: t.marketCap,
    beta: t.beta, sector: t.sector, industry: t.industry, range: `${t.yearLow}-${t.yearHigh}`,
    image: null, exchange: "NASDAQ", exchangeShortName: "NASDAQ", currency: "USD",
    description: null, country: "US", isEtf: false, isActivelyTrading: true,
  };

  const quote: FMPQuote = {
    symbol: t.ticker, name: t.name, price: t.price, change: t.change,
    changesPercentage: t.changePct, dayLow: +(t.price - 2).toFixed(2),
    dayHigh: +(t.price + 3).toFixed(2), yearLow: t.yearLow, yearHigh: t.yearHigh,
    volume: 45_000_000, avgVolume: 50_000_000, open: +(t.price - t.change * 0.3).toFixed(2),
    previousClose: +(t.price - t.change).toFixed(2), marketCap: t.marketCap,
    eps: t.eps, pe: t.pe, priceAvg50: sma50[0]?.sma ?? t.price,
    priceAvg200: sma200[0]?.sma ?? t.price, timestamp: Date.now(),
  };

  const keyMetrics: FMPKeyMetrics = {
    peRatioTTM: t.pe, pegRatioTTM: t.pegRatio, priceToSalesRatioTTM: t.pe * 0.3,
    enterpriseValueOverEBITDATTM: t.pe * 0.7, roeTTM: t.roe, roicTTM: t.roic,
    freeCashFlowYieldTTM: t.fcfYield, debtToEquityTTM: t.debtToEquity,
    currentRatioTTM: 1.5, netIncomePerShareTTM: t.eps,
    revenuePerShareTTM: +(t.eps / (t.operatingMargin * 0.8)).toFixed(2),
    freeCashFlowPerShareTTM: +(t.price * t.fcfYield).toFixed(2),
    bookValuePerShareTTM: +(t.price / (t.pe * t.roe)).toFixed(2),
    dividendYieldTTM: t.sector === "Technology" ? 0.005 : 0.025,
    marketCapTTM: t.marketCap,
  };

  const ratios: FMPRatios = {
    operatingProfitMarginTTM: t.operatingMargin, netProfitMarginTTM: t.operatingMargin * 0.7,
    grossProfitMarginTTM: t.operatingMargin + 0.2, returnOnEquityTTM: t.roe,
    returnOnAssetsTTM: t.roa, currentRatioTTM: 1.5, quickRatioTTM: 1.2,
    debtEquityRatioTTM: t.debtToEquity, debtRatioTTM: t.debtToEquity * 0.4,
    priceEarningsRatioTTM: t.pe, priceToBookRatioTTM: t.pe * t.roe,
    priceToSalesRatioTTM: t.pe * 0.3, dividendYielTTM: 0.005, payoutRatioTTM: 0.15,
  };

  const growth: FMPGrowth[] = Array.from({ length: 5 }, (_, i) => ({
    date: `${2025 - i}-12-31`, symbol: t.ticker,
    revenueGrowth: t.revenueGrowth * (1 + (Math.random() - 0.5) * 0.4),
    grossProfitGrowth: t.revenueGrowth * 1.1,
    operatingIncomeGrowth: t.epsGrowth * 0.9,
    netIncomeGrowth: t.epsGrowth * (1 + (Math.random() - 0.5) * 0.3),
    epsgrowth: t.epsGrowth * (1 + (Math.random() - 0.5) * 0.3),
    epsdilutedGrowth: t.epsGrowth * (1 + (Math.random() - 0.5) * 0.3),
    freeCashFlowGrowth: t.revenueGrowth * 1.2,
    operatingCashFlowGrowth: t.revenueGrowth * 1.1,
  }));

  const income: FMPIncomeStatement[] = Array.from({ length: 5 }, (_, i) => {
    const rev = t.marketCap * 0.15 * Math.pow(1 + t.revenueGrowth, -i);
    return {
      date: `${2025 - i}-12-31`, symbol: t.ticker, revenue: rev,
      grossProfit: rev * (t.operatingMargin + 0.2), operatingIncome: rev * t.operatingMargin,
      netIncome: rev * t.operatingMargin * 0.7, eps: t.eps * Math.pow(1 + t.epsGrowth * 0.3, -i),
      epsdiluted: t.eps * Math.pow(1 + t.epsGrowth * 0.3, -i),
      operatingExpenses: rev * (1 - t.operatingMargin) * 0.5,
      costOfRevenue: rev * (1 - t.operatingMargin - 0.2),
      sellingGeneralAndAdministrativeExpenses: rev * 0.1,
      researchAndDevelopmentExpenses: rev * 0.15,
    };
  });

  const cashflow: FMPCashFlow[] = [{
    date: "2025-12-31", symbol: t.ticker,
    operatingCashFlow: t.marketCap * 0.05, capitalExpenditure: -t.marketCap * 0.015,
    freeCashFlow: t.marketCap * 0.035, dividendsPaid: -t.marketCap * 0.005,
    netCashProvidedByOperatingActivities: t.marketCap * 0.05,
    netCashUsedForInvestingActivites: -t.marketCap * 0.02,
    netCashUsedProvidedByFinancingActivities: -t.marketCap * 0.01,
  }];

  const balance: FMPBalanceSheet = {
    date: "2025-12-31", symbol: t.ticker,
    totalAssets: t.marketCap * 0.4, totalLiabilities: t.marketCap * 0.15,
    totalStockholdersEquity: t.marketCap * 0.25,
    totalCurrentAssets: t.marketCap * 0.15, totalCurrentLiabilities: t.marketCap * 0.1,
    longTermDebt: t.marketCap * t.debtToEquity * 0.15, shortTermDebt: t.marketCap * 0.02,
    totalDebt: t.marketCap * t.debtToEquity * 0.17,
    cashAndCashEquivalents: t.marketCap * 0.06, netDebt: t.marketCap * t.debtToEquity * 0.11,
  };

  const dcfValue = t.price * (1 + (t.pegRatio < 1.5 ? 0.25 : -0.10));
  const dcf: FMPDCF = { symbol: t.ticker, date: "2025-12-31", dcf: +dcfValue.toFixed(2), price: t.price };

  const estimates: FMPEstimate = {
    symbol: t.ticker, date: "2026-12-31",
    estimatedRevenueAvg: t.marketCap * 0.15 * (1 + t.revenueGrowth),
    estimatedRevenueHigh: t.marketCap * 0.15 * (1 + t.revenueGrowth * 1.3),
    estimatedRevenueLow: t.marketCap * 0.15 * (1 + t.revenueGrowth * 0.7),
    estimatedEpsAvg: +(t.eps * (1 + t.epsGrowth * 0.3)).toFixed(2),
    estimatedEpsHigh: +(t.eps * (1 + t.epsGrowth * 0.5)).toFixed(2),
    estimatedEpsLow: +(t.eps * (1 + t.epsGrowth * 0.1)).toFixed(2),
    numberAnalystEstimatedRevenue: 30, numberAnalystsEstimatedEps: 28,
  };

  const recommendations: FMPRecommendation = {
    symbol: t.ticker, date: "2025-12-31",
    analystRatingsStrongBuy: t.strongBuy, analystRatingsBuy: t.buy,
    analystRatingsHold: t.hold, analystRatingsSell: t.sell,
    analystRatingsStrongSell: t.strongSell,
    analystRatingsbuySummary: t.strongBuy + t.buy,
  };

  const sectorPE: FMPSectorPE[] = [
    { date: "2025-12-31", sector: "Technology", pe: "32.5" },
    { date: "2025-12-31", sector: "Financial Services", pe: "14.2" },
    { date: "2025-12-31", sector: "Healthcare", pe: "22.8" },
    { date: "2025-12-31", sector: "Consumer Cyclical", pe: "25.1" },
    { date: "2025-12-31", sector: "Energy", pe: "11.5" },
    { date: "2025-12-31", sector: "Industrials", pe: "20.3" },
  ];

  return {
    ticker: t.ticker, profile, quote, keyMetrics, ratios, growth, income, cashflow,
    balance, dcf, estimates, recommendations, history, ema20, sma50, sma150, sma200, rsi, sectorPE,
  };
}

// ─── Public API ─────────────────────────────────────────────────

export function getMockTickerData(ticker: string): TickerData {
  const template = STOCK_TEMPLATES[ticker.toUpperCase()] ?? defaultTemplate(ticker.toUpperCase());
  return buildTickerData(template);
}

export function getMockMarketData(): MarketData {
  const spxHistory = generateHistory(5250, 300, 0.008);
  const spxSma50 = generateSMA(spxHistory, 50);
  const spxSma150 = generateSMA(spxHistory, 150);
  const spxSma200 = generateSMA(spxHistory, 200);
  const spxRsi = generateRSI(spxHistory);

  const voo: FMPQuote = {
    symbol: "VOO", name: "Vanguard S&P 500 ETF", price: 482.35, change: 3.21,
    changesPercentage: 0.67, dayLow: 479.10, dayHigh: 484.50, yearLow: 388.0,
    yearHigh: 498.0, volume: 4_200_000, avgVolume: 4_500_000, open: 480.0,
    previousClose: 479.14, marketCap: null, eps: null, pe: null,
    priceAvg50: 475.0, priceAvg200: 455.0, timestamp: Date.now(),
  };

  const qqq: FMPQuote = {
    symbol: "QQQ", name: "Invesco QQQ Trust", price: 435.80, change: 5.45,
    changesPercentage: 1.27, dayLow: 430.0, dayHigh: 437.0, yearLow: 340.0,
    yearHigh: 450.0, volume: 38_000_000, avgVolume: 40_000_000, open: 431.0,
    previousClose: 430.35, marketCap: null, eps: null, pe: null,
    priceAvg50: 425.0, priceAvg200: 400.0, timestamp: Date.now(),
  };

  const vtwo: FMPQuote = {
    symbol: "VTWO", name: "Vanguard Russell 2000 ETF", price: 82.45, change: -0.32,
    changesPercentage: -0.39, dayLow: 81.90, dayHigh: 83.10, yearLow: 68.0,
    yearHigh: 89.0, volume: 1_200_000, avgVolume: 1_500_000, open: 82.80,
    previousClose: 82.77, marketCap: null, eps: null, pe: null,
    priceAvg50: 80.0, priceAvg200: 76.0, timestamp: Date.now(),
  };

  const vix: FMPQuote = {
    symbol: "^VIX", name: "CBOE Volatility Index", price: 16.42, change: -0.58,
    changesPercentage: -3.41, dayLow: 15.80, dayHigh: 17.20, yearLow: 11.5,
    yearHigh: 38.0, volume: 0, avgVolume: 0, open: 17.0,
    previousClose: 17.0, marketCap: null, eps: null, pe: null,
    priceAvg50: null, priceAvg200: null, timestamp: Date.now(),
  };

  const treasury: FMPQuote = {
    symbol: "^TNX", name: "10-Year Treasury Yield", price: 4.28, change: -0.03,
    changesPercentage: -0.70, dayLow: 4.25, dayHigh: 4.35, yearLow: 3.80,
    yearHigh: 5.0, volume: 0, avgVolume: 0, open: 4.31,
    previousClose: 4.31, marketCap: null, eps: null, pe: null,
    priceAvg50: null, priceAvg200: null, timestamp: Date.now(),
  };

  const sectors: FMPSectorPerformance[] = [
    { sector: "Technology", changesPercentage: "1.42%" },
    { sector: "Healthcare", changesPercentage: "0.35%" },
    { sector: "Financial Services", changesPercentage: "0.78%" },
    { sector: "Consumer Cyclical", changesPercentage: "-0.21%" },
    { sector: "Energy", changesPercentage: "-0.85%" },
    { sector: "Industrials", changesPercentage: "0.52%" },
    { sector: "Communication Services", changesPercentage: "1.10%" },
    { sector: "Consumer Defensive", changesPercentage: "0.15%" },
    { sector: "Utilities", changesPercentage: "-0.42%" },
    { sector: "Real Estate", changesPercentage: "-0.65%" },
    { sector: "Basic Materials", changesPercentage: "0.28%" },
  ];

  const today = new Date().toISOString().split("T")[0];
  const econCalendar: FMPEconomicEvent[] = [
    { date: today, event: "Non-Farm Payrolls", country: "US", estimate: 180000, actual: 195000, previous: 175000, impact: "High" },
    { date: today, event: "CPI YoY", country: "US", estimate: 3.2, actual: 3.1, previous: 3.3, impact: "High" },
    { date: today, event: "Fed Interest Rate Decision", country: "US", estimate: 5.25, actual: null, previous: 5.25, impact: "High" },
    { date: today, event: "GDP Growth Rate QoQ", country: "US", estimate: 2.8, actual: 3.1, previous: 2.5, impact: "Medium" },
    { date: today, event: "Unemployment Rate", country: "US", estimate: 3.8, actual: 3.7, previous: 3.8, impact: "Medium" },
  ];

  const treasuryRates: FMPTreasuryRate = {
    date: today, month1: 5.35, month2: 5.33, month3: 5.30, month6: 5.18,
    year1: 4.85, year2: 4.52, year5: 4.15, year10: 4.28, year20: 4.55, year30: 4.42,
  };

  return {
    voo, qqq, vtwo, vix, treasury, sectors, econCalendar, treasuryRates,
    spxHistory, spxSma50, spxSma150, spxSma200, spxRsi,
  };
}
