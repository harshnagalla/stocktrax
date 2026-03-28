# Roadmap: StockTrax

## Overview

Build a comprehensive Adam Khoo-style stock analysis dashboard from the ground up. Start with the Next.js foundation and dark trading terminal UI, then build the always-visible market sentiment layer, add individual ticker analysis with FMP API integration, implement the VMI scoring engine (9 criteria), add technical analysis with Adam Khoo's MA slope methodology, and finish with the verdict/comparison features that tie everything together.

## Domain Expertise

None

## Phases

- [x] **Phase 1: Foundation & Layout** — Next.js + TS project, dark theme system, page layout structure, API key input, FMP API service layer
- [ ] **Phase 2: Market Sentiment Dashboard** — Always-visible macro view with composite score, F&G, VIX, SPX trend, sectors, movers, calendar, treasury
- [ ] **Phase 3: Ticker Analysis Core** — Search bar, FMP data fetching (18 endpoints per ticker), response caching, header card, API request counter
- [ ] **Phase 4: VMI Score Engine** — 9-criteria scoring system (0-100), visual gauge, fundamental scoreboard, valuation dashboard
- [ ] **Phase 5: Technical Analysis** — MA dashboard with slopes, trend assessment (50/150 SMA crossover + slopes), RSI, golden/death cross, trading signals
- [ ] **Phase 6: Verdicts & Comparison** — Adam Khoo verdict sections (VMI + Profit Snapper), analyst sentiment bar, multi-ticker comparison, breadth scan

## Phase Details

### Phase 1: Foundation & Layout
**Goal**: Working Next.js app with dark trading terminal theme, tabbed layout (Market/Analysis/Compare), API key input, and a reusable FMP API service layer with request counting
**Depends on**: Nothing (first phase)
**Research**: Unlikely (standard Next.js + Tailwind setup)
**Plans**: 3 plans

Plans:
- [x] 01-01: Next.js + TypeScript project setup with Tailwind, recharts, lucide-react dependencies
- [x] 01-02: Dark theme system (#0d1117 base), layout shell with header, tab navigation (Market/Analysis/Compare), API key input component
- [x] 01-03: FMP API service layer — typed fetch wrapper, request counter (250/day budget), response caching, error handling

### Phase 2: Market Sentiment Dashboard
**Goal**: Fully functional Market tab with composite sentiment score, CNN Fear & Greed gauge, VIX gauge, S&P 500 trend analysis (50/150/200 SMA with slopes), sector heatmap, market movers, economic calendar, and treasury yields
**Depends on**: Phase 1
**Research**: Likely (CNN Fear & Greed CORS handling, FMP stable vs v3 endpoint differences)
**Research topics**: CNN Fear & Greed endpoint CORS behavior from browser, FMP /stable/ vs /api/v3/ endpoint availability on free tier, sector performance data shape
**Plans**: 4 plans

Plans:
- [ ] 02-01: Market data fetching + index ticker bar + VIX gauge + treasury yield card
- [ ] 02-02: CNN F&G gauge (CORS fallback) + SPX trend card + sector grid + market movers
- [ ] 02-03: Economic calendar + composite sentiment score + wire all into MarketDashboard layout

### Phase 3: Ticker Analysis Core
**Goal**: Working ticker search that fetches all 18 FMP endpoints, caches responses, and displays the header card (price, change, 52-week range bar, market cap, sector, beta)
**Depends on**: Phase 1 (FMP service layer)
**Research**: Likely (FMP technical indicator endpoint response shapes, batch fetching patterns)
**Research topics**: FMP technical_indicator endpoint response format for EMA/SMA/RSI, rate limit behavior on parallel requests
**Plans**: 3 plans

Plans:
- [ ] 03-01: Ticker search bar component with loading states, multi-ticker support (up to 4), ticker management UI
- [ ] 03-02: FMP data fetching orchestrator — parallel fetch of all 18 endpoints per ticker with Promise.all, typed response interfaces, error handling per endpoint
- [ ] 03-03: Header card component — ticker, company name, price, daily change $/%,  52-week range visual bar, market cap formatting, sector badge, beta

### Phase 4: VMI Score Engine
**Goal**: Complete 9-criteria VMI scoring system with visual gauge (0-100), stacked breakdown chart, 7-criteria fundamental scoreboard with pass/fail, and valuation dashboard with sector P/E comparison
**Depends on**: Phase 3 (fetched ticker data)
**Research**: Unlikely (pure computation from already-fetched FMP data)
**Plans**: 4 plans

Plans:
- [ ] 04-01: VMI scoring functions — criteria 1-7 (business quality, 60 pts): earnings consistency, operating margin moat, growth drivers, conservative debt, ROE/ROA, ROIC, FCF health
- [ ] 04-02: VMI scoring functions — criteria 8-9 (valuation 20 pts + momentum 20 pts): PEG ratio, DCF margin of safety, MA trend alignment with slopes, short-term momentum
- [ ] 04-03: VMI visual gauge (0-100 with color zones), criteria breakdown chart (radar or stacked bar), score interpretation labels
- [ ] 04-04: 7-criteria fundamental scoreboard (card grid with pass/fail rows) + valuation dashboard (P/E, PEG, P/S, EV/EBITDA, FCF yield, DCF gauges with sector comparison)

### Phase 5: Technical Analysis
**Goal**: Complete Price Action section with MA dashboard (20 EMA, 50/150/200 SMA with current values and slopes), Adam Khoo trend assessment, golden/death cross detection, RSI gauge, and overall trading signal
**Depends on**: Phase 3 (fetched ticker data including technical indicators)
**Research**: Unlikely (computation from fetched MA/RSI data, UI rendering)
**Plans**: 3 plans

Plans:
- [ ] 05-01: MA slope calculation utilities + MA dashboard component (20 EMA, 50/150/200 SMA values, price position arrows, slope indicators, color coding)
- [ ] 05-02: Trend assessment engine — 50/150 SMA crossover + slope method, golden/death cross detection (50/200 + 50/150), short-term trend (20 EMA vs 50 SMA)
- [ ] 05-03: RSI gauge (0-100 with Adam Khoo zones) + overall trading signal computation (Strong Buy/Buy/Watch/Neutral/Avoid) + trading signal display card

### Phase 6: Verdicts & Comparison
**Goal**: Adam Khoo verdict sections (VMI investing + Profit Snapper trading), analyst sentiment bar, multi-ticker comparison table, and optional market breadth deep scan
**Depends on**: Phases 4 + 5 (VMI scores + technical signals)
**Research**: Unlikely (composition of existing computed data into UI)
**Plans**: 3 plans

Plans:
- [ ] 06-01: Adam Khoo verdict section — VMI verdict (score, signal, business quality/valuation/momentum breakdown, auto-generated key reasons) + Profit Snapper trading verdict (signal, trend, entry timing, key reasons)
- [ ] 06-02: Analyst sentiment bar (horizontal stacked buy/hold/sell, price target, implied upside/downside) + multi-ticker comparison table (side-by-side metrics, VMI ranking, trading signals)
- [ ] 06-03: Market breadth deep scan (optional button, S&P 500 constituents % above 200/50 SMA, batched with rate limiting) + final polish (animations, glow effects, responsive tweaks)

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Layout | 3/3 | Complete | 2026-03-28 |
| 2. Market Sentiment Dashboard | 0/3 | Not started | - |
| 3. Ticker Analysis Core | 0/3 | Not started | - |
| 4. VMI Score Engine | 0/4 | Not started | - |
| 5. Technical Analysis | 0/3 | Not started | - |
| 6. Verdicts & Comparison | 0/3 | Not started | - |
