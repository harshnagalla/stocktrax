const BASE_V3 = "https://financialmodelingprep.com/api/v3";
const BASE_V4 = "https://financialmodelingprep.com/api/v4";
const BASE_STABLE = "https://financialmodelingprep.com/stable";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Market Endpoints (loaded once on startup) ──────────────────

export function marketEndpoints(apiKey: string) {
  return {
    // Batch quote: VOO, QQQ, VTWO, VIX in ONE call
    batchQuotes: `${BASE_V3}/quote/VOO,QQQ,VTWO?apikey=${apiKey}`,
    vix: `${BASE_V3}/quote/%5EVIX?apikey=${apiKey}`,
    treasury: `${BASE_V3}/quote/%5ETNX?apikey=${apiKey}`,
    sectors: `${BASE_V3}/sectors-performance?apikey=${apiKey}`,
    econCalendar: `${BASE_STABLE}/economic-calendar?apikey=${apiKey}`,
    treasuryRates: `${BASE_STABLE}/treasury-rates?apikey=${apiKey}`,
    spxHistory: `${BASE_V3}/historical-price-full/%5EGSPC?timeseries=300&apikey=${apiKey}`,
    spxSma50: `${BASE_V3}/technical_indicator/daily/%5EGSPC?period=50&type=sma&apikey=${apiKey}`,
    spxSma150: `${BASE_V3}/technical_indicator/daily/%5EGSPC?period=150&type=sma&apikey=${apiKey}`,
    spxSma200: `${BASE_V3}/technical_indicator/daily/%5EGSPC?period=200&type=sma&apikey=${apiKey}`,
    spxRsi: `${BASE_V3}/technical_indicator/daily/%5EGSPC?period=14&type=rsi&apikey=${apiKey}`,
  };
}

// ─── Ticker Endpoints (per stock analysis) ───────────────────────
// Uses batch where possible to minimize API calls

export function tickerEndpoints(ticker: string, apiKey: string) {
  return {
    // These 2 calls give us quote + profile (can't batch different endpoint types)
    profile: `${BASE_V3}/profile/${ticker}?apikey=${apiKey}`,
    quote: `${BASE_V3}/quote/${ticker}?apikey=${apiKey}`,
    keyMetrics: `${BASE_V3}/key-metrics-ttm/${ticker}?apikey=${apiKey}`,
    ratios: `${BASE_V3}/ratios-ttm/${ticker}?apikey=${apiKey}`,
    growth: `${BASE_V3}/financial-growth/${ticker}?limit=5&apikey=${apiKey}`,
    income: `${BASE_V3}/income-statement/${ticker}?limit=5&apikey=${apiKey}`,
    cashflow: `${BASE_V3}/cash-flow-statement/${ticker}?limit=5&apikey=${apiKey}`,
    balance: `${BASE_V3}/balance-sheet-statement/${ticker}?limit=1&apikey=${apiKey}`,
    dcf: `${BASE_V3}/discounted-cash-flow/${ticker}?apikey=${apiKey}`,
    estimates: `${BASE_V3}/analyst-estimates/${ticker}?limit=1&apikey=${apiKey}`,
    recommendations: `${BASE_V3}/analyst-stock-recommendations/${ticker}?limit=1&apikey=${apiKey}`,
    history: `${BASE_V3}/historical-price-full/${ticker}?timeseries=300&apikey=${apiKey}`,
    ema20: `${BASE_V3}/technical_indicator/daily/${ticker}?period=20&type=ema&apikey=${apiKey}`,
    sma50: `${BASE_V3}/technical_indicator/daily/${ticker}?period=50&type=sma&apikey=${apiKey}`,
    sma150: `${BASE_V3}/technical_indicator/daily/${ticker}?period=150&type=sma&apikey=${apiKey}`,
    sma200: `${BASE_V3}/technical_indicator/daily/${ticker}?period=200&type=sma&apikey=${apiKey}`,
    rsi: `${BASE_V3}/technical_indicator/daily/${ticker}?period=14&type=rsi&apikey=${apiKey}`,
    sectorPE: `${BASE_V4}/sector_price_earning_ratio?date=${today()}&exchange=NYSE&apikey=${apiKey}`,
  };
}
