"use client";

import type { FMPQuote, FMPTreasuryRate } from "@/lib/fmp/types";

interface TreasuryCardProps {
  treasury: FMPQuote | null; // 10Y yield quote
  treasuryRates: FMPTreasuryRate | null;
}

function getYieldCurveStatus(spread: number): {
  label: string;
  color: string;
  borderClass: string;
} {
  if (spread < 0)
    return {
      label: "Inverted",
      color: "text-bearish",
      borderClass: "border-bearish/30",
    };
  if (spread < 0.2)
    return {
      label: "Flattening",
      color: "text-neutral",
      borderClass: "border-neutral/30",
    };
  return {
    label: "Normal",
    color: "text-bullish",
    borderClass: "border-bullish/30",
  };
}

export default function TreasuryCard({
  treasury,
  treasuryRates,
}: TreasuryCardProps) {
  const tenYear = treasuryRates?.year10 ?? treasury?.price ?? null;
  const twoYear = treasuryRates?.year2 ?? null;
  const spread = tenYear != null && twoYear != null ? tenYear - twoYear : null;
  const curve =
    spread != null
      ? getYieldCurveStatus(spread)
      : { label: "--", color: "text-text-secondary", borderClass: "border-border" };

  return (
    <div className={`rounded-lg border bg-bg-surface p-4 ${curve.borderClass}`}>
      <div className="mb-2 text-xs text-text-secondary">
        Treasury Yields — Yield Curve
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">10Y Yield</span>
          <span className="text-text-primary font-medium">
            {tenYear != null ? `${tenYear.toFixed(3)}%` : "--"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">2Y Yield</span>
          <span className="text-text-primary font-medium">
            {twoYear != null ? `${twoYear.toFixed(3)}%` : "--"}
          </span>
        </div>
        <div className="flex justify-between text-xs border-t border-border pt-1.5">
          <span className="text-text-secondary">10Y-2Y Spread</span>
          <span className={`font-medium ${curve.color}`}>
            {spread != null ? `${spread >= 0 ? "+" : ""}${spread.toFixed(3)}%` : "--"}
          </span>
        </div>
      </div>

      <div className={`mt-2 text-xs font-medium ${curve.color}`}>
        Yield Curve: {curve.label}
        {spread != null && spread < 0 && (
          <span className="ml-1 text-[10px] text-text-secondary">
            — recession warning
          </span>
        )}
      </div>
    </div>
  );
}
