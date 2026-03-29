const BASE_V3 = "https://financialmodelingprep.com/api/v3";
const BASE_V4 = "https://financialmodelingprep.com/api/v4";
const BASE_STABLE = "https://financialmodelingprep.com/stable";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Market Endpoints (loaded once on startup) ──────────────────

export function marketEndpoints(apiKey: string) {
  return {
    voo: `${BASE_V3}/quote/VOO?apikey=${apiKey}`,
    qqq: `${BASE_V3}/quote/QQQ?apikey=${apiKey}`,
    vtwo: `${BASE_V3}/quote/VTWO?apikey=${apiKey}`,
    vix: `${BASE_STABLE}/quote?symbol=^VIX&apikey=${apiKey}`,
    treasury: `${BASE_STABLE}/quote?symbol=^TNX&apikey=${apiKey}`,
    sectors: `${BASE_V3}/sectors-performance?apikey=${apiKey}`,
    gainers: `${BASE_STABLE}/biggest-gainers?apikey=${apiKey}`,
    losers: `${BASE_STABLE}/biggest-losers?apikey=${apiKey}`,
    actives: `${BASE_STABLE}/most-actives?apikey=${apiKey}`,
    econCalendar: `${BASE_STABLE}/economic-calendar?apikey=${apiKey}`,
    treasuryRates: `${BASE_STABLE}/treasury-rates?apikey=${apiKey}`,
    spxHistory: `${BASE_V3}/historical-price-full/^GSPC?timeseries=300&apikey=${apiKey}`,
    spxSma50: `${BASE_V3}/technical_indicator/daily/^GSPC?period=50&type=sma&apikey=${apiKey}`,
    spxSma150: `${BASE_V3}/technical_indicator/daily/^GSPC?period=150&type=sma&apikey=${apiKey}`,
    spxSma200: `${BASE_V3}/technical_indicator/daily/^GSPC?period=200&type=sma&apikey=${apiKey}`,
    spxRsi: `${BASE_V3}/technical_indicator/daily/^GSPC?period=14&type=rsi&apikey=${apiKey}`,
  };
}

// ─── Ticker Endpoints (per stock analysis) ───────────────────────

export function tickerEndpoints(ticker: string, apiKey: string) {
  return {
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
