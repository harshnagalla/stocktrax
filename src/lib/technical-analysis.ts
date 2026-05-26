/**
 * Technical Analysis — TypeScript port of ZhuLinsen/daily_stock_analysis StockTrendAnalyzer
 * Same logic, same thresholds as the original Python implementation.
 */

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendAnalysisResult {
  // Trend
  trendStatus:
    | 'STRONG_BULL'
    | 'BULL'
    | 'WEAK_BULL'
    | 'CONSOLIDATION'
    | 'WEAK_BEAR'
    | 'BEAR'
    | 'STRONG_BEAR';
  trendStrength: number; // 0-100
  maAlignment: string;

  // Moving averages
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  currentPrice: number;

  // Bias rates
  biasMa5: number; // (price - ma5) / ma5 * 100
  biasMa10: number;
  biasMa20: number;

  // Volume
  volumeStatus: 'HEAVY_UP' | 'HEAVY_DOWN' | 'SHRINK_UP' | 'SHRINK_DOWN' | 'NORMAL';
  volumeRatio5d: number;

  // MACD (12/26/9)
  macdDif: number;
  macdDea: number;
  macdBar: number;
  macdStatus:
    | 'GOLDEN_CROSS_ZERO'
    | 'GOLDEN_CROSS'
    | 'BULLISH'
    | 'CROSSING_UP'
    | 'CROSSING_DOWN'
    | 'BEARISH'
    | 'DEATH_CROSS';

  // RSI
  rsi6: number;
  rsi12: number;
  rsi24: number;
  rsiStatus: 'OVERBOUGHT' | 'STRONG_BUY' | 'NEUTRAL' | 'WEAK' | 'OVERSOLD';

  // Support/resistance
  supportMa5: boolean;
  supportMa10: boolean;
  supportLevels: number[];
  resistanceLevels: number[];

  // Signal
  buySignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'WAIT' | 'SELL' | 'STRONG_SELL';
  signalScore: number; // 0-100
  signalReasons: string[];
  riskFactors: string[];
}

// ---------------------------------------------------------------------------
// Core indicator functions
// ---------------------------------------------------------------------------

/**
 * Simple moving average of the last `period` values from `closes`.
 */
export function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) {
    throw new Error(`Not enough data: need ${period} closes, got ${closes.length}`);
  }
  const slice = closes.slice(closes.length - period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

/**
 * Exponential moving average using smoothing factor k = 2/(period+1).
 * Returns an array the same length as `closes`.
 * The first `period-1` values are seeded from a simple average of the first `period` elements.
 */
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) {
    throw new Error(`Not enough data: need ${period} closes, got ${closes.length}`);
  }

  const k = 2 / (period + 1);
  const result: number[] = new Array(closes.length);

  // Seed: SMA of first `period` values
  let seed = 0;
  for (let i = 0; i < period; i++) {
    seed += closes[i];
  }
  seed /= period;

  // Fill first period-1 slots with the seed value (matching Python behaviour
  // where the array is the same length as the input)
  for (let i = 0; i < period - 1; i++) {
    result[i] = seed;
  }
  result[period - 1] = seed;

  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }

  return result;
}

/**
 * Standard MACD (12/26/9).
 * DIF  = EMA12 − EMA26
 * DEA  = EMA9 of DIF
 * Bar  = (DIF − DEA) × 2
 */
export function calculateMACD(closes: number[]): {
  dif: number[];
  dea: number[];
  bar: number[];
} {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const dif = ema12.map((v, i) => v - ema26[i]);

  // EMA9 of DIF — treat dif as the input series
  const k9 = 2 / (9 + 1);
  const dea: number[] = new Array(dif.length);

  // Seed DEA with SMA of first 9 DIF values
  let seed = 0;
  for (let i = 0; i < 9; i++) seed += dif[i];
  seed /= 9;

  for (let i = 0; i < 9; i++) dea[i] = seed;
  dea[8] = seed;

  for (let i = 9; i < dif.length; i++) {
    dea[i] = dif[i] * k9 + dea[i - 1] * (1 - k9);
  }

  const bar = dif.map((v, i) => (v - dea[i]) * 2);

  return { dif, dea, bar };
}

/**
 * Wilder's RSI for a given `period`.
 * Uses the last `period + 1` closes (needs one extra to compute the first diff).
 * avgGain/avgLoss are seeded by the simple average of the first `period` diffs,
 * then smoothed with Wilder's method: avg = (prev * (period-1) + current) / period.
 */
export function calculateRSI(closes: number[], period: number): number {
  const needed = period + 1;
  if (closes.length < needed) {
    throw new Error(`Not enough data for RSI(${period}): need ${needed} closes, got ${closes.length}`);
  }

  // Use the last `needed` closes
  const slice = closes.slice(closes.length - needed);

  // Compute diffs
  const diffs: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    diffs.push(slice[i] - slice[i - 1]);
  }

  // Seed: simple average of first `period` diffs
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (diffs[i] > 0) avgGain += diffs[i];
    else avgLoss += Math.abs(diffs[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smoothing for remaining diffs (if any)
  for (let i = period; i < diffs.length; i++) {
    const gain = diffs[i] > 0 ? diffs[i] : 0;
    const loss = diffs[i] < 0 ? Math.abs(diffs[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ---------------------------------------------------------------------------
// Helper: rolling SMA at index i (exclusive end = i+1)
// ---------------------------------------------------------------------------
function smaAt(closes: number[], endIndex: number, period: number): number {
  const start = endIndex - period + 1;
  if (start < 0) throw new Error('Not enough data for smaAt');
  let sum = 0;
  for (let i = start; i <= endIndex; i++) sum += closes[i];
  return sum / period;
}

// ---------------------------------------------------------------------------
// Support / resistance: local minima / maxima over the last N candles
// ---------------------------------------------------------------------------
function findSupportResistance(
  candles: OHLCV[],
  lookback: number,
  currentPrice: number
): { supportLevels: number[]; resistanceLevels: number[] } {
  const window = candles.slice(-lookback);
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = 1; i < window.length - 1; i++) {
    const prev = window[i - 1];
    const curr = window[i];
    const next = window[i + 1];

    // Local low → support
    if (curr.low < prev.low && curr.low < next.low) {
      supports.push(curr.low);
    }
    // Local high → resistance
    if (curr.high > prev.high && curr.high > next.high) {
      resistances.push(curr.high);
    }
  }

  // Keep levels below / above current price and deduplicate / sort
  const filteredSupports = dedupLevels(
    supports.filter((v) => v < currentPrice),
    currentPrice
  ).sort((a, b) => b - a); // nearest first

  const filteredResistances = dedupLevels(
    resistances.filter((v) => v > currentPrice),
    currentPrice
  ).sort((a, b) => a - b); // nearest first

  return {
    supportLevels: filteredSupports.slice(0, 3),
    resistanceLevels: filteredResistances.slice(0, 3),
  };
}

/** Merge levels that are within 0.5% of each other */
function dedupLevels(levels: number[], reference: number): number[] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const merged: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (Math.abs(sorted[i] - last) / reference > 0.005) {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

/**
 * Analyse trend and generate a full TrendAnalysisResult from OHLCV candles.
 * Minimum 60 candles required.
 */
export function analyzeTrend(candles: OHLCV[]): TrendAnalysisResult {
  if (candles.length < 60) {
    throw new Error(`analyzeTrend requires at least 60 candles, got ${candles.length}`);
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const n = closes.length;
  const currentPrice = closes[n - 1];

  // -------------------------------------------------------------------------
  // Moving averages (current bar)
  // -------------------------------------------------------------------------
  const ma5 = smaAt(closes, n - 1, 5);
  const ma10 = smaAt(closes, n - 1, 10);
  const ma20 = smaAt(closes, n - 1, 20);
  const ma60 = smaAt(closes, n - 1, 60);

  // Previous bar MAs (for gap-widening detection)
  const prevMa5 = smaAt(closes, n - 2, 5);
  const prevMa10 = smaAt(closes, n - 2, 10);

  // -------------------------------------------------------------------------
  // Bias rates
  // -------------------------------------------------------------------------
  const biasMa5 = ((currentPrice - ma5) / ma5) * 100;
  const biasMa10 = ((currentPrice - ma10) / ma10) * 100;
  const biasMa20 = ((currentPrice - ma20) / ma20) * 100;

  // -------------------------------------------------------------------------
  // Trend status
  // -------------------------------------------------------------------------
  const currentGap = ma5 - ma10;
  const prevGap = prevMa5 - prevMa10;

  let trendStatus: TrendAnalysisResult['trendStatus'];
  let trendStrength: number;
  let maAlignment: string;

  const allAligned = ma5 > ma10 && ma10 > ma20;
  const allAlignedBear = ma5 < ma10 && ma10 < ma20;
  const gapWidening = Math.abs(currentGap) > Math.abs(prevGap);

  // Check if all MAs are within 2% of each other (consolidation)
  const maSpread =
    (Math.max(ma5, ma10, ma20) - Math.min(ma5, ma10, ma20)) / ma20;
  const isConsolidation = maSpread < 0.02;

  if (allAligned && gapWidening && currentGap > 0) {
    trendStatus = 'STRONG_BULL';
    trendStrength = 90;
    maAlignment = 'MA5 > MA10 > MA20 (gap widening)';
  } else if (allAligned) {
    trendStatus = 'BULL';
    trendStrength = 70;
    maAlignment = 'MA5 > MA10 > MA20';
  } else if (ma5 > ma10 && ma10 < ma20) {
    trendStatus = 'WEAK_BULL';
    trendStrength = 50;
    maAlignment = 'MA5 > MA10, MA10 < MA20';
  } else if (isConsolidation) {
    trendStatus = 'CONSOLIDATION';
    trendStrength = 40;
    maAlignment = 'MAs within 2% band';
  } else if (ma5 < ma10 && ma10 > ma20) {
    trendStatus = 'WEAK_BEAR';
    trendStrength = 30;
    maAlignment = 'MA5 < MA10, MA10 > MA20';
  } else if (allAlignedBear && gapWidening && currentGap < 0) {
    trendStatus = 'STRONG_BEAR';
    trendStrength = 10;
    maAlignment = 'MA5 < MA10 < MA20 (gap widening)';
  } else if (allAlignedBear) {
    trendStatus = 'BEAR';
    trendStrength = 20;
    maAlignment = 'MA5 < MA10 < MA20';
  } else {
    // Fallback — mixed
    trendStatus = 'CONSOLIDATION';
    trendStrength = 40;
    maAlignment = 'Mixed MA alignment';
  }

  // -------------------------------------------------------------------------
  // Volume analysis
  // -------------------------------------------------------------------------
  const avgVolume5d =
    volumes.slice(-6, -1).reduce((s, v) => s + v, 0) / 5;
  const currentVolume = volumes[n - 1];
  const volumeRatio5d = avgVolume5d > 0 ? currentVolume / avgVolume5d : 1;

  const priceUp = currentPrice >= closes[n - 2];
  let volumeStatus: TrendAnalysisResult['volumeStatus'];

  if (volumeRatio5d >= 1.5) {
    volumeStatus = priceUp ? 'HEAVY_UP' : 'HEAVY_DOWN';
  } else if (volumeRatio5d <= 0.7) {
    volumeStatus = priceUp ? 'SHRINK_UP' : 'SHRINK_DOWN';
  } else {
    volumeStatus = 'NORMAL';
  }

  // -------------------------------------------------------------------------
  // MACD
  // -------------------------------------------------------------------------
  const macdData = calculateMACD(closes);
  const macdDif = macdData.dif[n - 1];
  const macdDea = macdData.dea[n - 1];
  const macdBar = macdData.bar[n - 1];
  const prevMacdDif = macdData.dif[n - 2];
  const prevMacdDea = macdData.dea[n - 2];

  let macdStatus: TrendAnalysisResult['macdStatus'];
  const justCrossedUp = prevMacdDif <= prevMacdDea && macdDif > macdDea;
  const justCrossedDown = prevMacdDif >= prevMacdDea && macdDif < macdDea;

  if (justCrossedUp && macdDif > 0 && macdDea > 0) {
    macdStatus = 'GOLDEN_CROSS_ZERO';
  } else if (justCrossedUp) {
    macdStatus = 'GOLDEN_CROSS';
  } else if (justCrossedDown) {
    macdStatus = 'DEATH_CROSS';
  } else if (macdDif > macdDea && macdDif > 0) {
    macdStatus = 'BULLISH';
  } else if (macdDif > macdDea && macdDif <= 0) {
    // DIF crossing up toward zero
    macdStatus = 'CROSSING_UP';
  } else if (macdDif < macdDea && macdDif < 0) {
    macdStatus = macdBar < macdData.bar[n - 2] ? 'CROSSING_DOWN' : 'BEARISH';
  } else {
    macdStatus = 'BEARISH';
  }

  // -------------------------------------------------------------------------
  // RSI
  // -------------------------------------------------------------------------
  const rsi6 = calculateRSI(closes, 6);
  const rsi12 = calculateRSI(closes, 12);
  const rsi24 = calculateRSI(closes, 24);

  let rsiStatus: TrendAnalysisResult['rsiStatus'];
  if (rsi6 >= 80) {
    rsiStatus = 'OVERBOUGHT';
  } else if (rsi6 >= 60) {
    rsiStatus = 'STRONG_BUY';
  } else if (rsi6 >= 40) {
    rsiStatus = 'NEUTRAL';
  } else if (rsi6 >= 30) {
    rsiStatus = 'WEAK';
  } else {
    rsiStatus = 'OVERSOLD';
  }

  // -------------------------------------------------------------------------
  // Support / resistance
  // -------------------------------------------------------------------------
  const priceNearMa5 = Math.abs(biasMa5) < 1.5; // within 1.5% of MA5
  const supportMa5 = currentPrice > ma5 * 0.985 && currentPrice <= ma5 * 1.015;
  const supportMa10 =
    currentPrice > ma10 * 0.985 && currentPrice <= ma10 * 1.015;

  const { supportLevels, resistanceLevels } = findSupportResistance(
    candles,
    60,
    currentPrice
  );

  // -------------------------------------------------------------------------
  // Signal score
  // -------------------------------------------------------------------------
  let score = 50;
  const signalReasons: string[] = [];
  const riskFactors: string[] = [];

  // Trend component (max ±40)
  switch (trendStatus) {
    case 'STRONG_BULL':
      score += 40;
      signalReasons.push('Strong bullish trend: MA5 > MA10 > MA20 with widening gap');
      break;
    case 'BULL':
      score += 30;
      signalReasons.push('Bullish trend: MA5 > MA10 > MA20');
      break;
    case 'WEAK_BULL':
      score += 15;
      signalReasons.push('Weak bullish bias: MA5 > MA10 but MA10 below MA20');
      break;
    case 'CONSOLIDATION':
      // 0 adjustment
      break;
    case 'WEAK_BEAR':
      score -= 15;
      riskFactors.push('Weak bearish bias: MA5 < MA10 with MA10 above MA20');
      break;
    case 'BEAR':
      score -= 30;
      riskFactors.push('Bearish trend: MA5 < MA10 < MA20');
      break;
    case 'STRONG_BEAR':
      score -= 40;
      riskFactors.push('Strong bearish trend: MA5 < MA10 < MA20 with widening gap');
      break;
  }

  // Bias gate (non-negotiable)
  if (biasMa5 > 5) {
    score = Math.min(score, 30);
    riskFactors.push(`Price is ${biasMa5.toFixed(1)}% above MA5 — chasing risk`);
  } else if (biasMa5 < 0) {
    score += 5;
    signalReasons.push('Price below MA5 — potential entry zone');
  }

  // RSI component (max +20 / −15)
  if (rsi6 < 30) {
    score += 20;
    signalReasons.push(`RSI(6) oversold at ${rsi6.toFixed(1)}`);
  } else if (rsi6 < 40) {
    score += 10;
    signalReasons.push(`RSI(6) approaching oversold at ${rsi6.toFixed(1)}`);
  } else if (rsi6 > 70) {
    score -= 15;
    riskFactors.push(`RSI(6) overbought at ${rsi6.toFixed(1)}`);
  }

  // MACD component (max +15 / −10)
  switch (macdStatus) {
    case 'GOLDEN_CROSS_ZERO':
      score += 15;
      signalReasons.push('MACD golden cross above zero line');
      break;
    case 'GOLDEN_CROSS':
      score += 10;
      signalReasons.push('MACD golden cross');
      break;
    case 'BULLISH':
      score += 5;
      signalReasons.push('MACD bullish (DIF > DEA > 0)');
      break;
    case 'DEATH_CROSS':
      score -= 10;
      riskFactors.push('MACD death cross — bearish signal');
      break;
    default:
      break;
  }

  // Volume component (max +10 / −10)
  if (volumeStatus === 'SHRINK_DOWN' && priceNearMa5) {
    score += 10;
    signalReasons.push('Ideal pullback: shrinking volume near MA5 support');
  } else if (volumeStatus === 'SHRINK_UP') {
    score += 5;
    signalReasons.push('Price rising on reduced volume — low sell pressure');
  } else if (volumeStatus === 'HEAVY_UP') {
    score += 3;
    signalReasons.push('Heavy volume on up move — buying conviction');
  } else if (volumeStatus === 'HEAVY_DOWN') {
    score -= 10;
    riskFactors.push('Heavy volume on down move — strong selling pressure');
  }

  // Support component (max +5)
  if (supportMa5) {
    score += 5;
    signalReasons.push('Price near MA5 support');
  } else if (supportMa10) {
    score += 3;
    signalReasons.push('Price near MA10 support');
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // -------------------------------------------------------------------------
  // Buy signal from score
  // -------------------------------------------------------------------------
  let buySignal: TrendAnalysisResult['buySignal'];
  if (score >= 75) buySignal = 'STRONG_BUY';
  else if (score >= 60) buySignal = 'BUY';
  else if (score >= 45) buySignal = 'HOLD';
  else if (score >= 30) buySignal = 'WAIT';
  else if (score >= 15) buySignal = 'SELL';
  else buySignal = 'STRONG_SELL';

  // Override rules
  if (trendStatus === 'BEAR' || trendStatus === 'STRONG_BEAR') {
    const bearSignalRank = ['STRONG_BUY', 'BUY', 'HOLD', 'WAIT', 'SELL', 'STRONG_SELL'];
    const currentRank = bearSignalRank.indexOf(buySignal);
    const waitRank = bearSignalRank.indexOf('WAIT');
    if (currentRank < waitRank) {
      buySignal = 'WAIT';
      riskFactors.push('Signal capped at WAIT due to bear trend');
    }
  }

  if (biasMa5 > 5) {
    const chaseSignalRank = ['STRONG_BUY', 'BUY', 'HOLD', 'WAIT', 'SELL', 'STRONG_SELL'];
    const currentRank = chaseSignalRank.indexOf(buySignal);
    const waitRank = chaseSignalRank.indexOf('WAIT');
    if (currentRank < waitRank) {
      buySignal = 'WAIT';
    }
  }

  // Force STRONG_BUY on ideal confluence
  if (
    trendStatus === 'STRONG_BULL' &&
    macdStatus === 'GOLDEN_CROSS_ZERO' &&
    rsi6 < 35
  ) {
    buySignal = 'STRONG_BUY';
    signalReasons.push(
      'Forced STRONG_BUY: strong bull trend + MACD golden cross above zero + RSI oversold'
    );
  }

  return {
    trendStatus,
    trendStrength,
    maAlignment,
    ma5,
    ma10,
    ma20,
    ma60,
    currentPrice,
    biasMa5,
    biasMa10,
    biasMa20,
    volumeStatus,
    volumeRatio5d,
    macdDif,
    macdDea,
    macdBar,
    macdStatus,
    rsi6,
    rsi12,
    rsi24,
    rsiStatus,
    supportMa5,
    supportMa10,
    supportLevels,
    resistanceLevels,
    buySignal,
    signalScore: score,
    signalReasons,
    riskFactors,
  };
}
