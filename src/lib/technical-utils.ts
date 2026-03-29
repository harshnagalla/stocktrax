import type { TickerData } from "@/lib/fmp/types";
import {
  calculateSlope,
  getSlopeDirection,
  extractIndicatorValues,
} from "@/lib/market-utils";

// ─── Interfaces ─────────────────────────────────────────────────

export interface MAData {
  label: string;
  value: number | null;
  slope: number;
  slopeDir: "up" | "down" | "flat";
  priceAbove: boolean;
}

export interface TrendAssessment {
  trend:
    | "Strong Uptrend"
    | "Uptrend"
    | "Neutral"
    | "Downtrend"
    | "Strong Downtrend";
  color: string;
  details: string[];
}

export interface CrossSignal {
  type: "Golden Cross" | "Death Cross" | "None";
  pair: string;
  color: string;
}

export interface TradingSignal {
  signal: "Strong Buy" | "Buy" | "Watch" | "Neutral" | "Avoid";
  color: string;
  reasons: string[];
}

// ─── Helpers ────────────────────────────────────────────────────

function latestValue(values: number[]): number | null {
  return values.length > 0 ? values[0] : null;
}

function currentPrice(data: TickerData): number | null {
  return data.quote?.price ?? null;
}

// ─── MA Data ────────────────────────────────────────────────────

export function getMAData(data: TickerData): MAData[] {
  const price = currentPrice(data);

  const configs: {
    label: string;
    indicators: typeof data.ema20;
    field: "ema" | "sma";
  }[] = [
    { label: "20 EMA", indicators: data.ema20, field: "ema" },
    { label: "50 SMA", indicators: data.sma50, field: "sma" },
    { label: "150 SMA", indicators: data.sma150, field: "sma" },
    { label: "200 SMA", indicators: data.sma200, field: "sma" },
  ];

  return configs.map(({ label, indicators, field }) => {
    const values = extractIndicatorValues(indicators, field);
    const value = latestValue(values);
    const slope = calculateSlope(values);
    const slopeDir = getSlopeDirection(slope);
    const priceAbove = price != null && value != null ? price > value : false;

    return { label, value, slope, slopeDir, priceAbove };
  });
}

// ─── Trend Assessment ───────────────────────────────────────────

export function assessTrend(data: TickerData): TrendAssessment {
  const price = currentPrice(data);
  const mas = getMAData(data);

  const ma50 = mas.find((m) => m.label === "50 SMA");
  const ma150 = mas.find((m) => m.label === "150 SMA");
  const ma200 = mas.find((m) => m.label === "200 SMA");

  const details: string[] = [];

  if (!price || !ma50?.value || !ma150?.value) {
    return { trend: "Neutral", color: "text-neutral", details: ["Insufficient data for trend analysis"] };
  }

  const fiftyAbove150 = ma50.value > ma150.value;
  const fiftySlopeUp = ma50.slopeDir === "up";
  const oneFiftySlopeUp = ma150.slopeDir === "up";
  const fiftySlopeDown = ma50.slopeDir === "down";
  const oneFiftySlopeDown = ma150.slopeDir === "down";
  const priceAbove50 = price > ma50.value;
  const priceAbove150 = price > ma150.value;
  const priceAboveAll =
    priceAbove50 &&
    priceAbove150 &&
    (ma200?.value == null || price > ma200.value);
  const priceBelowAll =
    !priceAbove50 &&
    !priceAbove150 &&
    (ma200?.value == null || price <= ma200.value);

  // Build detail strings
  details.push(
    fiftyAbove150
      ? "50 SMA above 150 SMA (bullish alignment)"
      : "50 SMA below 150 SMA (bearish alignment)"
  );
  details.push(`50 SMA slope: ${ma50.slopeDir}`);
  details.push(`150 SMA slope: ${ma150.slopeDir}`);
  details.push(
    priceAbove50
      ? "Price above 50 SMA"
      : "Price below 50 SMA"
  );

  // Strong Uptrend
  if (fiftyAbove150 && fiftySlopeUp && oneFiftySlopeUp && priceAbove50) {
    return { trend: "Strong Uptrend", color: "text-bullish", details };
  }

  // Uptrend
  if (priceAbove150 && fiftySlopeUp) {
    return { trend: "Uptrend", color: "text-bullish", details };
  }

  // Strong Downtrend
  if (!fiftyAbove150 && fiftySlopeDown && oneFiftySlopeDown && priceBelowAll) {
    return { trend: "Strong Downtrend", color: "text-bearish", details };
  }

  // Downtrend
  if (!priceAbove150 && fiftySlopeDown) {
    return { trend: "Downtrend", color: "text-bearish", details };
  }

  // Neutral
  return { trend: "Neutral", color: "text-neutral", details };
}

// ─── Cross Detection ────────────────────────────────────────────

function detectCross(
  shortTermIndicators: TickerData["sma50"],
  longTermIndicators: TickerData["sma150"],
  shortField: "sma" | "ema",
  longField: "sma" | "ema",
  pair: string
): CrossSignal {
  const shortVals = extractIndicatorValues(shortTermIndicators, shortField);
  const longVals = extractIndicatorValues(longTermIndicators, longField);

  if (shortVals.length < 21 || longVals.length < 21) {
    return { type: "None", pair, color: "text-text-secondary" };
  }

  const shortNow = shortVals[0];
  const longNow = longVals[0];
  const shortThen = shortVals[20];
  const longThen = longVals[20];

  const aboveNow = shortNow > longNow;
  const aboveThen = shortThen > longThen;

  if (aboveNow && !aboveThen) {
    return { type: "Golden Cross", pair, color: "text-bullish" };
  }
  if (!aboveNow && aboveThen) {
    return { type: "Death Cross", pair, color: "text-bearish" };
  }

  return { type: "None", pair, color: "text-text-secondary" };
}

export function detectCrosses(data: TickerData): CrossSignal[] {
  const crosses: CrossSignal[] = [];

  crosses.push(detectCross(data.sma50, data.sma200, "sma", "sma", "50/200"));
  crosses.push(detectCross(data.sma50, data.sma150, "sma", "sma", "50/150"));

  return crosses.filter((c) => c.type !== "None");
}

// ─── Trading Signal ─────────────────────────────────────────────

export function calculateTradingSignal(data: TickerData): TradingSignal {
  const trend = assessTrend(data);
  const mas = getMAData(data);
  const rsiValues = extractIndicatorValues(data.rsi, "rsi");
  const rsi = latestValue(rsiValues);
  const reasons: string[] = [];

  const priceAboveAll = mas.every((m) => m.priceAbove);
  const priceBelowAll = mas.every((m) => !m.priceAbove);

  reasons.push(`Trend: ${trend.trend}`);
  if (rsi != null) {
    reasons.push(`RSI: ${rsi.toFixed(1)}`);
  }
  if (priceAboveAll) {
    reasons.push("Price above all key MAs");
  } else if (priceBelowAll) {
    reasons.push("Price below all key MAs");
  }

  // Strong Buy: Strong Uptrend + RSI 40-65 + price above all MAs
  if (
    trend.trend === "Strong Uptrend" &&
    rsi != null &&
    rsi >= 40 &&
    rsi <= 65 &&
    priceAboveAll
  ) {
    reasons.push("Ideal RSI range for strong uptrend entry");
    return { signal: "Strong Buy", color: "text-bullish", reasons };
  }

  // Buy: Uptrend + RSI not overbought
  if (
    (trend.trend === "Uptrend" || trend.trend === "Strong Uptrend") &&
    (rsi == null || rsi < 70)
  ) {
    reasons.push("Uptrend confirmed with RSI not overbought");
    return { signal: "Buy", color: "text-bullish", reasons };
  }

  // Avoid: Downtrend or RSI > 80 or price below all MAs
  if (
    trend.trend === "Downtrend" ||
    trend.trend === "Strong Downtrend" ||
    (rsi != null && rsi > 80) ||
    priceBelowAll
  ) {
    if (rsi != null && rsi > 80) reasons.push("RSI extremely overbought");
    if (
      trend.trend === "Downtrend" ||
      trend.trend === "Strong Downtrend"
    )
      reasons.push("Confirmed downtrend — avoid");
    return { signal: "Avoid", color: "text-bearish", reasons };
  }

  // Watch: Neutral trend or RSI 65-75
  if (trend.trend === "Neutral" || (rsi != null && rsi >= 65 && rsi <= 75)) {
    if (rsi != null && rsi >= 65) reasons.push("RSI approaching overbought zone");
    return { signal: "Watch", color: "text-neutral", reasons };
  }

  // Neutral: mixed signals
  return { signal: "Neutral", color: "text-text-secondary", reasons };
}
