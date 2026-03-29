// FMP API Response Types
// Fields typed as `number | null` where FMP may return null values.

// ─── Company & Quote ─────────────────────────────────────────────

export interface FMPProfile {
  symbol: string;
  companyName: string;
  price: number | null;
  mktCap: number | null;
  beta: number | null;
  sector: string | null;
  industry: string | null;
  range: string | null; // "123.45-678.90"
  image: string | null;
  exchange: string | null;
  exchangeShortName: string | null;
  currency: string | null;
  description: string | null;
  country: string | null;
  isEtf: boolean;
  isActivelyTrading: boolean;
}

export interface FMPQuote {
  symbol: string;
  name: string | null;
  price: number | null;
  change: number | null;
  changesPercentage: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  volume: number | null;
  avgVolume: number | null;
  open: number | null;
  previousClose: number | null;
  marketCap: number | null;
  eps: number | null;
  pe: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  timestamp: number | null;
}

// ─── Key Metrics & Ratios ────────────────────────────────────────

export interface FMPKeyMetrics {
  peRatioTTM: number | null;
  pegRatioTTM: number | null;
  priceToSalesRatioTTM: number | null;
  enterpriseValueOverEBITDATTM: number | null;
  roeTTM: number | null;
  roicTTM: number | null;
  freeCashFlowYieldTTM: number | null;
  debtToEquityTTM: number | null;
  currentRatioTTM: number | null;
  netIncomePerShareTTM: number | null;
  revenuePerShareTTM: number | null;
  freeCashFlowPerShareTTM: number | null;
  bookValuePerShareTTM: number | null;
  dividendYieldTTM: number | null;
  marketCapTTM: number | null;
}

export interface FMPRatios {
  operatingProfitMarginTTM: number | null;
  netProfitMarginTTM: number | null;
  grossProfitMarginTTM: number | null;
  returnOnEquityTTM: number | null;
  returnOnAssetsTTM: number | null;
  currentRatioTTM: number | null;
  quickRatioTTM: number | null;
  debtEquityRatioTTM: number | null;
  debtRatioTTM: number | null;
  priceEarningsRatioTTM: number | null;
  priceToBookRatioTTM: number | null;
  priceToSalesRatioTTM: number | null;
  dividendYielTTM: number | null;
  payoutRatioTTM: number | null;
}

// ─── Growth ──────────────────────────────────────────────────────

export interface FMPGrowth {
  date: string;
  symbol: string;
  revenueGrowth: number | null;
  grossProfitGrowth: number | null;
  operatingIncomeGrowth: number | null;
  netIncomeGrowth: number | null;
  epsgrowth: number | null;
  epsdilutedGrowth: number | null;
  freeCashFlowGrowth: number | null;
  operatingCashFlowGrowth: number | null;
}

// ─── Financial Statements ────────────────────────────────────────

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
  epsdiluted: number | null;
  operatingExpenses: number | null;
  costOfRevenue: number | null;
  sellingGeneralAndAdministrativeExpenses: number | null;
  researchAndDevelopmentExpenses: number | null;
}

export interface FMPCashFlow {
  date: string;
  symbol: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
  netCashProvidedByOperatingActivities: number | null;
  netCashUsedForInvestingActivites: number | null;
  netCashUsedProvidedByFinancingActivities: number | null;
}

export interface FMPBalanceSheet {
  date: string;
  symbol: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalStockholdersEquity: number | null;
  totalCurrentAssets: number | null;
  totalCurrentLiabilities: number | null;
  longTermDebt: number | null;
  shortTermDebt: number | null;
  totalDebt: number | null;
  cashAndCashEquivalents: number | null;
  netDebt: number | null;
}

// ─── Valuation ───────────────────────────────────────────────────

export interface FMPDCF {
  symbol: string;
  date: string;
  dcf: number | null;
  price: number | null;
}

// ─── Analyst ─────────────────────────────────────────────────────

export interface FMPEstimate {
  symbol: string;
  date: string;
  estimatedRevenueAvg: number | null;
  estimatedRevenueHigh: number | null;
  estimatedRevenueLow: number | null;
  estimatedEpsAvg: number | null;
  estimatedEpsHigh: number | null;
  estimatedEpsLow: number | null;
  numberAnalystEstimatedRevenue: number | null;
  numberAnalystsEstimatedEps: number | null;
}

export interface FMPRecommendation {
  symbol: string;
  date: string;
  analystRatingsStrongBuy: number | null;
  analystRatingsBuy: number | null;
  analystRatingsHold: number | null;
  analystRatingsSell: number | null;
  analystRatingsStrongSell: number | null;
  analystRatingsbuySummary: number | null;
}

// ─── Historical & Technical ──────────────────────────────────────

export interface FMPHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
  change?: number;
  changePercent?: number;
}

export interface FMPHistoricalResponse {
  symbol: string;
  historical: FMPHistoricalPrice[];
}

export interface FMPTechnicalIndicator {
  date: string;
  close: number;
  ema?: number;
  sma?: number;
  rsi?: number;
}

// ─── Market Sentiment ────────────────────────────────────────────

export interface FMPSectorPerformance {
  sector: string;
  changesPercentage: string; // FMP returns as string like "1.234%"
}

export interface FMPMarketMover {
  symbol: string;
  name: string | null;
  change: number | null;
  price: number | null;
  changesPercentage: number | null;
}

export interface FMPEconomicEvent {
  date: string;
  event: string;
  country: string | null;
  estimate: number | null;
  actual: number | null;
  previous: number | null;
  impact: string | null; // "High", "Medium", "Low"
}

export interface FMPTreasuryRate {
  date: string;
  month1: number | null;
  month2: number | null;
  month3: number | null;
  month6: number | null;
  year1: number | null;
  year2: number | null;
  year5: number | null;
  year10: number | null;
  year20: number | null;
  year30: number | null;
}

export interface FMPSectorPE {
  date: string;
  sector: string;
  pe: string; // FMP returns as string
}

// ─── Aggregate Data Types ────────────────────────────────────────

export interface MarketData {
  voo: FMPQuote | null;
  qqq: FMPQuote | null;
  vtwo: FMPQuote | null;
  vix: FMPQuote | null;
  treasury: FMPQuote | null;
  sectors: FMPSectorPerformance[];
  gainers: FMPMarketMover[];
  losers: FMPMarketMover[];
  actives: FMPMarketMover[];
  econCalendar: FMPEconomicEvent[];
  treasuryRates: FMPTreasuryRate | null;
  spxHistory: FMPHistoricalPrice[];
  spxSma50: FMPTechnicalIndicator[];
  spxSma150: FMPTechnicalIndicator[];
  spxSma200: FMPTechnicalIndicator[];
  spxRsi: FMPTechnicalIndicator[];
}

export interface TickerData {
  ticker: string;
  profile: FMPProfile | null;
  quote: FMPQuote | null;
  keyMetrics: FMPKeyMetrics | null;
  ratios: FMPRatios | null;
  growth: FMPGrowth[];
  income: FMPIncomeStatement[];
  cashflow: FMPCashFlow[];
  balance: FMPBalanceSheet | null;
  dcf: FMPDCF | null;
  estimates: FMPEstimate | null;
  recommendations: FMPRecommendation | null;
  history: FMPHistoricalPrice[];
  ema20: FMPTechnicalIndicator[];
  sma50: FMPTechnicalIndicator[];
  sma150: FMPTechnicalIndicator[];
  sma200: FMPTechnicalIndicator[];
  rsi: FMPTechnicalIndicator[];
  sectorPE: FMPSectorPE[];
}
