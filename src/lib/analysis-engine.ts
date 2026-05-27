export type TrendSignal = "BUY" | "HOLD" | "SELL" | "WATCH";

export interface TechnicalSnapshot {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
}

export interface SignalResult {
  signal: TrendSignal;
  reason: string;
  buyAt: number | null;
}

export interface ScreenerScore {
  score: number;
  signal: "STRONG BUY" | "BUY" | "WATCH" | "AVOID" | "HOLD";
  reasons: string[];
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((sum, close) => sum + close, 0) / period;
}

export function calculateWilderRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }

  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function getTechnicalSnapshot(closes: number[]): TechnicalSnapshot {
  return {
    ma5: calculateSMA(closes, 5),
    ma10: calculateSMA(closes, 10),
    ma20: calculateSMA(closes, 20),
    ma60: calculateSMA(closes, 60),
    sma50: calculateSMA(closes, 50),
    sma150: calculateSMA(closes, 150),
    sma200: calculateSMA(closes, 200),
    rsi: calculateWilderRSI(closes),
  };
}

export function getTrendSignal(
  price: number,
  { sma50, sma150, sma200, rsi }: TechnicalSnapshot
): SignalResult {
  if (sma50 === 0 || sma150 === 0 || sma200 === 0) {
    return { signal: "HOLD", reason: "Not enough data", buyAt: null };
  }

  const aboveSma50 = price > sma50;
  const aboveSma150 = price > sma150;
  const aboveSma200 = price > sma200;
  const sma50Above150 = sma50 > sma150;
  const distFromSma50 = ((price - sma50) / sma50) * 100;
  const distFromSma150 = ((price - sma150) / sma150) * 100;
  const nearSma150 = Math.abs(distFromSma150) <= 3;

  if (aboveSma150 && sma50Above150 && !aboveSma50 && rsi < 35) {
    return {
      signal: "BUY",
      reason: `Pullback to support with RSI oversold (${Math.round(rsi)}). Price below 50 SMA ($${sma50.toFixed(0)}) but uptrend intact. Best entry zone.`,
      buyAt: Math.round(price),
    };
  }

  if (aboveSma200 && sma50Above150 && nearSma150 && rsi < 40) {
    return {
      signal: "BUY",
      reason: `Deep pullback near 150 SMA support ($${sma150.toFixed(0)}). RSI ${Math.round(rsi)} approaching oversold. Strong entry if uptrend holds.`,
      buyAt: Math.round(sma150),
    };
  }

  if (aboveSma200 && !sma50Above150 && rsi < 45) {
    return {
      signal: "BUY",
      reason: `Early recovery zone. Above 200 SMA, trend transitioning. Start small and wait for 50 SMA to reclaim 150 SMA.`,
      buyAt: Math.round(sma200),
    };
  }

  if (aboveSma50 && sma50Above150 && distFromSma50 > 5) {
    return {
      signal: "HOLD",
      reason: `Uptrend intact but price ${distFromSma50.toFixed(0)}% above 50 SMA. Too extended to buy. Wait for pullback to $${sma50.toFixed(0)}.`,
      buyAt: Math.round(sma50),
    };
  }

  if (aboveSma150 && sma50Above150) {
    return {
      signal: "HOLD",
      reason: `Uptrend with 50 SMA ($${sma50.toFixed(0)}) > 150 SMA. RSI ${Math.round(rsi)} neutral. Hold, add on pullbacks below 50 SMA.`,
      buyAt: Math.round(sma50),
    };
  }

  if (!aboveSma150 && !sma50Above150) {
    return {
      signal: "SELL",
      reason: `Downtrend. Price below 150 SMA ($${sma150.toFixed(0)}), 50 SMA crossed below 150. Cut losses and redeploy to stronger stocks.`,
      buyAt: null,
    };
  }

  if (!aboveSma200 && sma50Above150) {
    return {
      signal: "WATCH",
      reason: `Below 200 SMA ($${sma200.toFixed(0)}) but 50>150 still intact. Correction may deepen. Wait for price to reclaim 200 SMA.`,
      buyAt: Math.round(sma200),
    };
  }

  if (aboveSma200 && !sma50Above150 && rsi >= 45) {
    return {
      signal: "WATCH",
      reason: `Transitioning. Above 200 SMA but 50 crossing below 150. RSI ${Math.round(rsi)} not oversold yet. Wait for RSI < 40 for better entry.`,
      buyAt: Math.round(sma200),
    };
  }

  return { signal: "HOLD", reason: `Mixed signals. RSI ${Math.round(rsi)}. Monitor for clearer trend.`, buyAt: null };
}

export function scoreScreenerSetup(
  price: number,
  snapshot: TechnicalSnapshot,
  fiftyTwoWeekLow: number,
  fiftyTwoWeekHigh: number
): ScreenerScore {
  const { sma50, sma150, sma200, rsi } = snapshot;
  let score = 0;
  const reasons: string[] = [];

  const distFromSma50 = sma50 > 0 ? ((price - sma50) / sma50) * 100 : 0;
  const aboveSma50 = price > sma50;
  const aboveSma150 = price > sma150;
  const aboveSma200 = price > sma200;
  const sma50Above150 = sma50 > sma150;

  if (aboveSma150 && sma50Above150 && !aboveSma50) {
    score += 35;
    reasons.push("Pullback below 50 SMA in uptrend");
  } else if (aboveSma200 && !sma50Above150) {
    score += 30;
    reasons.push("Transition zone");
  } else if (aboveSma50 && sma50Above150 && Math.abs(distFromSma50) < 3) {
    score += 20;
    reasons.push("Near 50 SMA support");
  } else if (aboveSma50 && sma50Above150) {
    score += 10;
    reasons.push("Uptrend; wait for pullback");
  }

  if (rsi < 25) {
    score += 30;
    reasons.push("RSI deeply oversold");
  } else if (rsi < 35) {
    score += 25;
    reasons.push("RSI oversold");
  } else if (rsi < 45) {
    score += 15;
    reasons.push("RSI approaching oversold");
  } else if (rsi > 70) {
    score -= 10;
    reasons.push("RSI overbought; wait");
  }

  const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
  const posInRange = range > 0 ? (price - fiftyTwoWeekLow) / range : 0.5;
  if (posInRange < 0.25) {
    score += 20;
    reasons.push("Near 52W lows; potential value");
  } else if (posInRange < 0.4) {
    score += 10;
    reasons.push("Lower range");
  } else if (posInRange > 0.9) {
    score -= 5;
    reasons.push("Near 52W highs");
  }

  if (aboveSma200) score += 15;
  else reasons.push("Below 200 SMA");

  score = Math.max(0, Math.min(100, score));

  let signal: ScreenerScore["signal"];
  if (score >= 65) signal = "STRONG BUY";
  else if (score >= 45) signal = "BUY";
  else if (score >= 25 && aboveSma200) signal = "WATCH";
  else if (!aboveSma150 && !sma50Above150) signal = "AVOID";
  else signal = "HOLD";

  return { score, signal, reasons };
}
