// Sector performance shape (simplified from FMP)
interface SectorPerf {
  changesPercentage: string;
}

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

// ─── Composite Market Sentiment Score ────────────────────────────

export interface SentimentResult {
  score: number;
  label: string;
  color: string;
  commentary: string;
}

export function calculateSentimentScore(
  vixLevel: number,
  regime: MarketRegime,
  sectors: SectorPerf[]
): SentimentResult {
  // VIX component (30%)
  let vixScore: number;
  if (vixLevel < 15) vixScore = 85;
  else if (vixLevel < 20) vixScore = 65;
  else if (vixLevel < 30) vixScore = 40;
  else vixScore = 15;

  // SPX Trend component (35%)
  const trendScores: Record<MarketRegime["regime"], number> = {
    Bull: 90,
    "Bull Correction": 60,
    Transitioning: 40,
    Bear: 10,
  };
  const trendScore = trendScores[regime.regime];

  // Sector Breadth component (35%)
  const positiveSectors = sectors.filter(
    (s) => parseFloat(s.changesPercentage.replace("%", "")) >= 0
  ).length;
  const sectorRatio = sectors.length > 0 ? positiveSectors / sectors.length : 0.5;
  const sectorScore = sectorRatio * 90 + 10;

  const score = Math.round(
    vixScore * 0.3 + trendScore * 0.35 + sectorScore * 0.35
  );

  let label: string;
  let color: string;
  let commentary: string;

  if (score >= 80) {
    label = "Market Euphoria";
    color = "text-bullish";
    commentary =
      "Extreme greed — market may be overextended. Tighten stop-losses and be cautious of new positions.";
  } else if (score >= 60) {
    label = "Bullish Sentiment";
    color = "text-bullish";
    commentary =
      "Favorable for long positions. Look for quality setups with confirmed uptrends.";
  } else if (score >= 40) {
    label = "Neutral / Mixed";
    color = "text-neutral";
    commentary =
      "Be selective — stick to high-quality setups. Ideal for finding Trend Retracement entries.";
  } else if (score >= 20) {
    label = "Bearish / Fearful";
    color = "text-neutral";
    commentary =
      "Caution for new longs. Potential opportunities forming — watch for capitulation signals.";
  } else {
    label = "Capitulation";
    color = "text-bearish";
    commentary =
      'Extreme fear — "Be greedy when others are fearful." Look for quality stocks at discounts.';
  }

  return { score, label, color, commentary };
}

