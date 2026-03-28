import type { FMPTechnicalIndicator } from "./fmp/types";

/**
 * Calculate slope as percentage change over lookback period.
 * Values should be ordered newest-first (index 0 = most recent).
 */
export function calculateSlope(
  values: number[],
  lookback: number = 20
): number {
  if (values.length < lookback) return 0;
  const recent = values[0];
  const older = values[lookback - 1];
  if (older === 0) return 0;
  return ((recent - older) / older) * 100;
}

export function getSlopeDirection(slope: number): "up" | "down" | "flat" {
  if (slope > 0.5) return "up";
  if (slope < -0.5) return "down";
  return "flat";
}

const SLOPE_ARROW: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

export function getSlopeArrow(slope: number): string {
  return SLOPE_ARROW[getSlopeDirection(slope)];
}

export interface MarketRegime {
  regime: "Bull" | "Bull Correction" | "Transitioning" | "Bear";
  bias: "LONG" | "SHORT" | "NEUTRAL/CASH";
  color: string; // Tailwind color class
}

export function getMarketRegime(
  spxPrice: number,
  sma50: number,
  sma150: number,
  sma200: number,
  slope50: number,
  slope150: number,
  slope200: number
): MarketRegime {
  const allSlopingUp =
    getSlopeDirection(slope50) === "up" &&
    getSlopeDirection(slope150) === "up" &&
    getSlopeDirection(slope200) === "up";

  const sma50Above150 = sma50 > sma150;
  const sma150Above200 = sma150 > sma200;
  const priceAbove50 = spxPrice > sma50;
  const priceAbove150 = spxPrice > sma150;

  // Bull: price > 50 > 150 > 200, all sloping up
  if (priceAbove50 && sma50Above150 && sma150Above200 && allSlopingUp) {
    return { regime: "Bull", bias: "LONG", color: "text-bullish" };
  }

  // Bull Correction: below 50 but above 150/200, MAs still pointing up
  if (
    !priceAbove50 &&
    priceAbove150 &&
    sma50Above150 &&
    getSlopeDirection(slope150) !== "down"
  ) {
    return { regime: "Bull Correction", bias: "LONG", color: "text-neutral" };
  }

  // Bear: 50 < 150, both sloping down
  if (
    !sma50Above150 &&
    getSlopeDirection(slope50) === "down" &&
    getSlopeDirection(slope150) === "down"
  ) {
    return { regime: "Bear", bias: "SHORT", color: "text-bearish" };
  }

  // Transitioning: everything else
  return {
    regime: "Transitioning",
    bias: "NEUTRAL/CASH",
    color: "text-neutral",
  };
}

/**
 * Extract SMA/EMA values from FMP technical indicator array.
 * Returns values newest-first.
 */
export function extractIndicatorValues(
  indicators: FMPTechnicalIndicator[],
  field: "sma" | "ema" | "rsi"
): number[] {
  return indicators
    .filter((i) => i[field] != null)
    .map((i) => i[field] as number);
}
