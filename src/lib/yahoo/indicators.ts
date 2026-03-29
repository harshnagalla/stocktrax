import type { FMPHistoricalPrice, FMPTechnicalIndicator } from "../fmp/types";

/**
 * Compute SMA from historical prices (newest-first input).
 * Returns array of FMPTechnicalIndicator with `sma` field, newest-first.
 */
export function computeSMA(
  history: FMPHistoricalPrice[],
  period: number
): FMPTechnicalIndicator[] {
  if (history.length < period) return [];
  const result: FMPTechnicalIndicator[] = [];

  for (let i = 0; i <= history.length - period; i++) {
    let sum = 0;
    for (let j = i; j < i + period; j++) {
      sum += history[j].close;
    }
    result.push({
      date: history[i].date,
      close: history[i].close,
      sma: +(sum / period).toFixed(2),
    });
  }

  return result;
}

/**
 * Compute EMA from historical prices (newest-first input).
 * Returns array with `ema` field, newest-first.
 */
export function computeEMA(
  history: FMPHistoricalPrice[],
  period: number
): FMPTechnicalIndicator[] {
  if (history.length < period) return [];

  // Work oldest-first for EMA calculation
  const reversed = [...history].reverse();
  const k = 2 / (period + 1);

  // Seed EMA with SMA of first `period` prices
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += reversed[i].close;
  }
  ema /= period;

  const values: { date: string; close: number; ema: number }[] = [];
  values.push({ date: reversed[period - 1].date, close: reversed[period - 1].close, ema: +ema.toFixed(2) });

  for (let i = period; i < reversed.length; i++) {
    ema = reversed[i].close * k + ema * (1 - k);
    values.push({ date: reversed[i].date, close: reversed[i].close, ema: +ema.toFixed(2) });
  }

  return values.reverse();
}

/**
 * Compute RSI from historical prices (newest-first input).
 * Returns array with `rsi` field, newest-first.
 */
export function computeRSI(
  history: FMPHistoricalPrice[],
  period: number = 14
): FMPTechnicalIndicator[] {
  if (history.length < period + 1) return [];

  // Work oldest-first
  const reversed = [...history].reverse();

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = reversed[i].close - reversed[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  const result: FMPTechnicalIndicator[] = [];

  for (let i = period; i < reversed.length; i++) {
    const diff = reversed[i].close - reversed[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = +(100 - 100 / (1 + rs)).toFixed(2);
    result.push({ date: reversed[i].date, close: reversed[i].close, rsi });
  }

  return result.reverse();
}
