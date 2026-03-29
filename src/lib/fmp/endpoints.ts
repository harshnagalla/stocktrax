const BASE = "https://financialmodelingprep.com/stable";

// ─── Market Endpoints (loaded once on startup) ──────────────────

export function marketEndpoints(apiKey: string) {
  return {
    // Batch quote: VOO, QQQ, VTWO in ONE call
    batchQuotes: `${BASE}/quote?symbol=VOO,QQQ,VTWO&apikey=${apiKey}`,
    vix: `${BASE}/quote?symbol=%5EVIX&apikey=${apiKey}`,
    treasury: `${BASE}/quote?symbol=%5ETNX&apikey=${apiKey}`,
    sectors: `${BASE}/sector-performance-snapshot?apikey=${apiKey}`,
    econCalendar: `${BASE}/economics-calendar?apikey=${apiKey}`,
    treasuryRates: `${BASE}/treasury-rates?apikey=${apiKey}`,
    spxHistory: `${BASE}/historical-price-eod/full?symbol=%5EGSPC&apikey=${apiKey}`,
    spxSma50: `${BASE}/simple-moving-average?symbol=%5EGSPC&periodLength=50&timeframe=daily&apikey=${apiKey}`,
    spxSma150: `${BASE}/simple-moving-average?symbol=%5EGSPC&periodLength=150&timeframe=daily&apikey=${apiKey}`,
    spxSma200: `${BASE}/simple-moving-average?symbol=%5EGSPC&periodLength=200&timeframe=daily&apikey=${apiKey}`,
    spxRsi: `${BASE}/relative-strength-index?symbol=%5EGSPC&periodLength=14&timeframe=daily&apikey=${apiKey}`,
  };
}

// ─── Ticker Endpoints (per stock analysis) ───────────────────────

export function tickerEndpoints(ticker: string, apiKey: string) {
  return {
    profile: `${BASE}/profile?symbol=${ticker}&apikey=${apiKey}`,
    quote: `${BASE}/quote?symbol=${ticker}&apikey=${apiKey}`,
    keyMetrics: `${BASE}/key-metrics-ttm?symbol=${ticker}&apikey=${apiKey}`,
    ratios: `${BASE}/ratios-ttm?symbol=${ticker}&apikey=${apiKey}`,
    growth: `${BASE}/financial-growth?symbol=${ticker}&limit=5&apikey=${apiKey}`,
    income: `${BASE}/income-statement?symbol=${ticker}&limit=5&apikey=${apiKey}`,
    cashflow: `${BASE}/cash-flow-statement?symbol=${ticker}&limit=5&apikey=${apiKey}`,
    balance: `${BASE}/balance-sheet-statement?symbol=${ticker}&limit=1&apikey=${apiKey}`,
    dcf: `${BASE}/dcf?symbol=${ticker}&apikey=${apiKey}`,
    estimates: `${BASE}/analyst-estimates?symbol=${ticker}&limit=1&apikey=${apiKey}`,
    recommendations: `${BASE}/analyst-stock-recommendations?symbol=${ticker}&limit=1&apikey=${apiKey}`,
    history: `${BASE}/historical-price-eod/full?symbol=${ticker}&apikey=${apiKey}`,
    ema20: `${BASE}/exponential-moving-average?symbol=${ticker}&periodLength=20&timeframe=daily&apikey=${apiKey}`,
    sma50: `${BASE}/simple-moving-average?symbol=${ticker}&periodLength=50&timeframe=daily&apikey=${apiKey}`,
    sma150: `${BASE}/simple-moving-average?symbol=${ticker}&periodLength=150&timeframe=daily&apikey=${apiKey}`,
    sma200: `${BASE}/simple-moving-average?symbol=${ticker}&periodLength=200&timeframe=daily&apikey=${apiKey}`,
    rsi: `${BASE}/relative-strength-index?symbol=${ticker}&periodLength=14&timeframe=daily&apikey=${apiKey}`,
    sectorPE: `${BASE}/sector-pe-snapshot?apikey=${apiKey}`,
  };
}

// ─── Batch quote URL (for portfolio) ─────────────────────────────

export function batchQuoteUrl(tickers: string[], apiKey: string): string {
  return `${BASE}/quote?symbol=${tickers.join(",")}&apikey=${apiKey}`;
}
