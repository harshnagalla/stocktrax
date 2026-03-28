# StockTrax

## What This Is

A personal Adam Khoo-style Stock Analysis Dashboard built with Next.js and TypeScript. Enter a stock ticker and get a comprehensive analysis using both his long-term investing framework (Value Momentum Investing / VMI) with a 9-criteria scoring system (0-100), and his trading framework (Profit Snapper / Trend Retracement System) with technical indicator analysis. Includes an always-visible market sentiment dashboard with macro indicators.

## Core Value

Accurate, real-time VMI scoring (9 criteria: 7 business quality + valuation + momentum) with actionable trading signals — all computed from structured FMP API data, not AI-generated guesses.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Market Sentiment Dashboard** — Always-visible macro view: Composite Market Sentiment Score, CNN Fear & Greed gauge, VIX volatility gauge, S&P 500 trend analysis (50/150/200 SMA with slopes), sector performance heatmap, market movers (gainers/losers/actives), economic calendar, treasury yield & yield curve status
- [ ] **Ticker Input & Data Fetching** — Clean search bar, FMP API integration with ~18 endpoints per ticker, loading states, API request counter (250/day budget), caching in state
- [ ] **Header Card** — Ticker, company name, price, daily change, 52-week range visual bar, market cap, sector, beta
- [ ] **VMI Score Engine (9 Criteria)** — Composite score 0-100 with visual gauge: Business Quality (60 pts: earnings consistency, economic moat via operating margin, growth drivers, conservative debt per Adam Khoo's 3x net income rule, ROE/ROA, ROIC, FCF health), Valuation (20 pts: PEG ratio + DCF margin of safety), Momentum (20 pts: MA alignment/slopes + short-term timing)
- [ ] **Price Action / Trading Analysis** — Moving average dashboard (20 EMA, 50/150/200 SMA with slopes), trend assessment (Adam Khoo's 50/150 SMA crossover + slope method), golden/death cross detection, RSI gauge with Adam Khoo zones, overall trading signal (Strong Buy/Buy/Watch/Neutral/Avoid)
- [ ] **Valuation Dashboard** — Visual cards for Forward P/E, PEG, P/S, EV/EBITDA, FCF yield, DCF intrinsic value with margin of safety %, sector P/E comparison
- [ ] **7-Criteria Fundamental Scoreboard** — Card grid with pass/fail for each criterion, color-coded rows, additional metrics (net margin, D/E, current ratio, beta)
- [ ] **Analyst Sentiment Bar** — Horizontal stacked bar (buy/hold/sell), average price target with implied upside/downside, analyst count
- [ ] **Adam Khoo Verdict Section** — Auto-generated VMI verdict (score, signal, key reasons) and Profit Snapper trading verdict (signal, trend, entry timing, key reasons)
- [ ] **Multi-Ticker Comparison** — Side-by-side comparison table (up to 4 tickers) with VMI score ranking, trading signals, key metrics
- [ ] **Market Breadth (Optional Deep Scan)** — % of S&P 500 stocks above 200 SMA and 50 SMA, fetched on-demand via button with rate limiting
- [ ] **Dark Trading Terminal UI** — Bloomberg/TradingView-inspired dark theme (#0d1117), green/red/amber color coding, animated gauges, glow effects, responsive layout, recharts for visualizations, lucide-react for icons

### Out of Scope

- **Claude API Deep Analysis** — Deferred to v2. The qualitative narrative (news sentiment, competitive positioning, catalysts) via Anthropic API + web search is supplementary and adds cost/complexity. FMP data is sufficient for v1.
- **User authentication / multi-user** — Personal tool, no login needed
- **Portfolio tracking / watchlists with persistence** — v1 is analysis-only, no saved state beyond session
- **Real-time WebSocket streaming** — FMP free tier is REST-only; polling on manual refresh is fine
- **Mobile native app** — Responsive web is sufficient
- **Backtesting / paper trading** — Out of scope entirely

## Context

- **Adam Khoo's VMI Framework**: 9 specific criteria — 7 for business quality (earnings consistency, moat via operating margins, growth drivers, conservative debt < 3x net income, ROE > 15% & ROA > 7%, ROIC > 12-15%, FCF health), 1 for valuation (PEG + DCF), 1 for momentum (MA alignment + slopes). This is the analytical core.
- **Adam Khoo's Trading Framework (Profit Snapper)**: Uses 20 EMA, 50 SMA, 150 SMA, 200 SMA. The 50/150 SMA crossover WITH slope confirmation is his primary trend signal. Slope matters as much as crossover. Entry timing uses price pullback to 20 EMA or 50 SMA support.
- **Key correction from common misconceptions**: Adam Khoo does NOT use the traditional 50/200 golden cross as primary signal. His primary signal is 50 SMA vs 150 SMA with slope direction. RSI alone is not an entry signal — wait for 20 EMA to turn up.
- **FMP API free tier**: 250 requests/day. Market sentiment costs ~17 requests on load, each ticker costs ~18 requests. Budget allows ~4 full ticker analyses per session with room for refreshes.
- **CNN Fear & Greed**: Public endpoint at `production.dataviz.cnn.io` may block CORS from browsers. Need fallback handling.

## Constraints

- **Tech Stack**: Next.js + TypeScript, deployed on Vercel. Backend/DB via Firebase or Neon (for future persistence needs).
- **API Budget**: FMP free tier = 250 requests/day. Must show request counter and budget carefully.
- **CORS**: CNN Fear & Greed endpoint may block browser requests. Need graceful fallback.
- **Data Source**: All financial data from FMP structured JSON endpoints. No AI-generated financial data.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + TypeScript on Vercel | User preference for Vercel deployment, type safety | — Pending |
| FMP API as sole data source (v1) | Structured JSON, free tier, reliable. Anthropic API deferred to v2 | — Pending |
| Firebase or Neon for backend | Future persistence (watchlists, saved analyses). Not needed for v1 MVP | — Pending |
| 9-criteria VMI scoring (not simplified 4-category) | Faithful to Adam Khoo's actual methodology | — Pending |
| Defer Claude API Deep Analysis to v2 | Reduces complexity, cost, and API dependency for v1 | — Pending |

---
*Last updated: 2026-03-28 after initialization*
