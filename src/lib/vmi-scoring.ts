import type { TickerData } from "@/lib/fmp/types";

export interface VMICriterion {
  name: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface VMIScore {
  total: number;
  label: string;
  color: string;
  criteria: VMICriterion[];
  businessQuality: number;
  valuation: number;
  momentum: number;
}

function safeNum(v: number | null | undefined): number | null {
  if (v == null || !isFinite(v)) return null;
  return v;
}

function pct(v: number | null): string {
  if (v == null) return "--";
  return `${(v * 100).toFixed(1)}%`;
}

// 1. Earnings Consistency (10 pts)
function scoreEarningsConsistency(data: TickerData): VMICriterion {
  const growthArr = data.growth ?? [];
  // Use up to last 4 years (index 0 = most recent)
  const recent = growthArr.slice(0, 4);
  const positiveYears = recent.filter(
    (g) => safeNum(g.epsdilutedGrowth) !== null && g.epsdilutedGrowth! > 0
  ).length;
  const total = recent.length;

  let score = 0;
  if (total >= 4 && positiveYears === 4) score = 10;
  else if (positiveYears >= 3) score = 7;
  else if (positiveYears >= 2) score = 3;

  return {
    name: "Earnings Consistency",
    score,
    maxScore: 10,
    detail: `EPS grew ${positiveYears}/${total} years`,
  };
}

// 2. Operating Margin Moat (10 pts)
function scoreOperatingMargin(data: TickerData): VMICriterion {
  const raw = safeNum(data.ratios?.operatingProfitMarginTTM);
  let score = 0;
  if (raw != null) {
    const margin = raw; // already a decimal ratio from FMP
    if (margin > 0.2) score = 10;
    else if (margin > 0.15) score = 7;
    else if (margin > 0.1) score = 5;
    else if (margin > 0.05) score = 3;
  }
  return {
    name: "Operating Margin",
    score,
    maxScore: 10,
    detail: raw != null ? `${(raw * 100).toFixed(1)}%` : "--",
  };
}

// 3. Growth Drivers (10 pts)
function scoreGrowthDrivers(data: TickerData): VMICriterion {
  const latest = data.growth?.[0];
  const rev = safeNum(latest?.revenueGrowth);
  let score = 0;
  if (rev != null) {
    if (rev > 0.15) score = 10;
    else if (rev > 0.1) score = 7;
    else if (rev > 0.05) score = 5;
    else if (rev > 0) score = 3;
  }
  return {
    name: "Growth Drivers",
    score,
    maxScore: 10,
    detail: rev != null ? `Rev growth: ${(rev * 100).toFixed(1)}%` : "--",
  };
}

// 4. Conservative Debt (10 pts)
function scoreDebt(data: TickerData): VMICriterion {
  const de = safeNum(data.keyMetrics?.debtToEquityTTM);
  let score = 0;
  if (de != null) {
    if (de < 0.3) score = 10;
    else if (de < 0.5) score = 8;
    else if (de < 1.0) score = 5;
    else if (de < 2.0) score = 3;
  }
  return {
    name: "Conservative Debt",
    score,
    maxScore: 10,
    detail: de != null ? `D/E: ${de.toFixed(2)}` : "--",
  };
}

// 5. ROE / ROA (10 pts)
function scoreROEROA(data: TickerData): VMICriterion {
  const roe = safeNum(data.ratios?.returnOnEquityTTM);
  const roa = safeNum(data.ratios?.returnOnAssetsTTM);

  let roePts = 0;
  if (roe != null) {
    if (roe > 0.2) roePts = 5;
    else if (roe > 0.15) roePts = 3;
    else if (roe > 0.1) roePts = 2;
  }

  let roaPts = 0;
  if (roa != null) {
    if (roa > 0.1) roaPts = 5;
    else if (roa > 0.07) roaPts = 3;
    else if (roa > 0.05) roaPts = 2;
  }

  return {
    name: "ROE / ROA",
    score: roePts + roaPts,
    maxScore: 10,
    detail: `ROE: ${pct(roe)}, ROA: ${pct(roa)}`,
  };
}

// 6. ROIC (5 pts)
function scoreROIC(data: TickerData): VMICriterion {
  const roic = safeNum(data.keyMetrics?.roicTTM);
  let score = 0;
  if (roic != null) {
    if (roic > 0.2) score = 5;
    else if (roic > 0.15) score = 4;
    else if (roic > 0.1) score = 3;
    else if (roic > 0.05) score = 1;
  }
  return {
    name: "ROIC",
    score,
    maxScore: 5,
    detail: roic != null ? `${(roic * 100).toFixed(1)}%` : "--",
  };
}

// 7. FCF Health (5 pts)
function scoreFCFHealth(data: TickerData): VMICriterion {
  const fcfYield = safeNum(data.keyMetrics?.freeCashFlowYieldTTM);
  let score = 0;
  if (fcfYield != null) {
    // FMP returns as decimal, e.g. 0.08 = 8%
    const pctVal = fcfYield * 100;
    if (pctVal > 8) score = 5;
    else if (pctVal > 5) score = 4;
    else if (pctVal > 3) score = 3;
    else if (pctVal > 0) score = 1;
  }
  return {
    name: "FCF Health",
    score,
    maxScore: 5,
    detail: fcfYield != null ? `FCF Yield: ${(fcfYield * 100).toFixed(1)}%` : "--",
  };
}

// 8. PEG + DCF (20 pts)
function scoreValuation(data: TickerData): VMICriterion {
  const peg = safeNum(data.keyMetrics?.pegRatioTTM);
  let pegPts = 0;
  if (peg != null && peg > 0) {
    if (peg <= 1) pegPts = 10;
    else if (peg <= 1.5) pegPts = 7;
    else if (peg <= 2) pegPts = 4;
  }

  const dcfVal = safeNum(data.dcf?.dcf);
  const dcfPrice = safeNum(data.dcf?.price);
  let dcfPts = 0;
  let marginStr = "--";
  if (dcfVal != null && dcfPrice != null && dcfVal > 0) {
    if (dcfVal > dcfPrice) {
      const margin = ((dcfVal - dcfPrice) / dcfVal) * 100;
      marginStr = `${margin.toFixed(1)}%`;
      if (margin > 30) dcfPts = 10;
      else if (margin > 15) dcfPts = 7;
      else if (margin > 0) dcfPts = 4;
    } else {
      const margin = ((dcfVal - dcfPrice) / dcfVal) * 100;
      marginStr = `${margin.toFixed(1)}%`;
    }
  }

  return {
    name: "PEG + DCF",
    score: pegPts + dcfPts,
    maxScore: 20,
    detail: `PEG: ${peg != null ? peg.toFixed(2) : "--"}, DCF MoS: ${marginStr}`,
  };
}

// 9. MA Trend + Momentum (20 pts)
function scoreMomentum(data: TickerData): VMICriterion {
  const price = safeNum(data.quote?.price);
  const sma50Val = safeNum(data.sma50?.[0]?.sma ?? null);
  const sma150Val = safeNum(data.sma150?.[0]?.sma ?? null);
  const sma200Val = safeNum(data.sma200?.[0]?.sma ?? null);
  const ema20Val = safeNum(data.ema20?.[0]?.ema ?? null);
  const rsiVal = safeNum(data.rsi?.[0]?.rsi ?? null);

  let trendPts = 0;
  if (
    price != null &&
    sma50Val != null &&
    sma150Val != null &&
    sma200Val != null
  ) {
    if (price > sma50Val && sma50Val > sma150Val && sma150Val > sma200Val) {
      trendPts = 10;
    } else if (price > sma200Val) {
      trendPts = 5;
    }
  }

  let shortPts = 0;
  if (price != null && ema20Val != null && price > ema20Val) {
    shortPts = 5;
  }

  let rsiPts = 0;
  if (rsiVal != null) {
    if (rsiVal >= 40 && rsiVal <= 70) rsiPts = 5;
    else if ((rsiVal >= 30 && rsiVal < 40) || (rsiVal > 70 && rsiVal <= 80))
      rsiPts = 3;
  }

  const parts: string[] = [];
  if (trendPts === 10) parts.push("MA aligned");
  else if (trendPts === 5) parts.push("Above 200 SMA");
  else parts.push("MA weak");
  if (shortPts > 0) parts.push("Above 20 EMA");
  if (rsiVal != null) parts.push(`RSI: ${rsiVal.toFixed(0)}`);

  return {
    name: "MA Trend + Momentum",
    score: trendPts + shortPts + rsiPts,
    maxScore: 20,
    detail: parts.join(", "),
  };
}

export function calculateVMIScore(data: TickerData): VMIScore {
  const c1 = scoreEarningsConsistency(data);
  const c2 = scoreOperatingMargin(data);
  const c3 = scoreGrowthDrivers(data);
  const c4 = scoreDebt(data);
  const c5 = scoreROEROA(data);
  const c6 = scoreROIC(data);
  const c7 = scoreFCFHealth(data);
  const c8 = scoreValuation(data);
  const c9 = scoreMomentum(data);

  const criteria = [c1, c2, c3, c4, c5, c6, c7, c8, c9];
  const businessQuality = c1.score + c2.score + c3.score + c4.score + c5.score + c6.score + c7.score;
  const valuation = c8.score;
  const momentum = c9.score;
  const total = businessQuality + valuation + momentum;

  let label: string;
  let color: string;
  if (total >= 80) {
    label = "Strong Buy";
    color = "text-bullish";
  } else if (total >= 60) {
    label = "Buy";
    color = "text-bullish";
  } else if (total >= 40) {
    label = "Hold";
    color = "text-neutral";
  } else if (total >= 20) {
    label = "Sell";
    color = "text-bearish";
  } else {
    label = "Strong Sell";
    color = "text-bearish";
  }

  return { total, label, color, criteria, businessQuality, valuation, momentum };
}
