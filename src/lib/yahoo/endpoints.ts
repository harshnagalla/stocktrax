const BASE = "https://yahoo-finance15.p.rapidapi.com";

export function yahooHeaders(apiKey: string) {
  return {
    "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com",
    "x-rapidapi-key": apiKey,
  };
}

// ─── Market Endpoints ───────────────────────────────────────────

export function yahooMarketEndpoints() {
  return {
    // Batch quote for market indices / ETFs
    quotes: (tickers: string) => `${BASE}/api/v1/markets/stock/quotes?ticker=${tickers}`,
    // S&P 500 history for trend analysis
    spxHistory: `${BASE}/api/v1/markets/stock/history?symbol=%5EGSPC&interval=1d&diffandsplits=false`,
    // Market movers
    topGainers: `${BASE}/api/yahoo/ga/topgainers?start=0`,
    topLosers: `${BASE}/api/yahoo/ga/toplosers?start=0`,
  };
}

// ─── Ticker Endpoints ───────────────────────────────────────────

export function yahooTickerEndpoints(ticker: string) {
  const mod = (module: string) =>
    `${BASE}/api/v1/markets/stock/modules?ticker=${ticker}&module=${module}`;

  return {
    quote: `${BASE}/api/v1/markets/stock/quotes?ticker=${ticker}`,
    history: `${BASE}/api/v1/markets/stock/history?symbol=${ticker}&interval=1d&diffandsplits=false`,
    financialData: mod("financial-data"),
    assetProfile: mod("asset-profile"),
    keyStatistics: mod("default-key-statistics"),
    incomeStatement: mod("income-statement"),
    balanceSheet: mod("balance-sheet"),
    cashflowStatement: mod("cashflow-statement"),
    recommendationTrend: mod("recommendation-trend"),
    earnings: mod("earnings"),
  };
}
