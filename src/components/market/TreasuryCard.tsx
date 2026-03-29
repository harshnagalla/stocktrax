"use client";

import type { FMPQuote, FMPTreasuryRate } from "@/lib/fmp/types";

interface TreasuryCardProps {
  treasury: FMPQuote | null;
  treasuryRates: FMPTreasuryRate | null;
}

function getYieldCurveStatus(spread: number) {
  if (spread < 0) return { label: "Inverted", color: "text-bearish", bg: "bg-bearish/10" };
  if (spread < 0.2) return { label: "Flattening", color: "text-neutral", bg: "bg-neutral/10" };
  return { label: "Normal", color: "text-bullish", bg: "bg-bullish/10" };
}

export default function TreasuryCard({ treasury, treasuryRates }: TreasuryCardProps) {
  const tenYear = treasuryRates?.year10 ?? treasury?.price ?? null;
  const twoYear = treasuryRates?.year2 ?? null;
  const spread = tenYear != null && twoYear != null ? tenYear - twoYear : null;
  const curve = spread != null
    ? getYieldCurveStatus(spread)
    : { label: "--", color: "text-text-secondary", bg: "bg-bg-surface" };

  return (
    <div className={`rounded-2xl p-5 ${curve.bg}`}>
      <div className="text-xs font-medium text-text-secondary">Yield Curve</div>
      <div className={`mt-1 text-lg font-bold ${curve.color}`}>{curve.label}</div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-text-secondary">10Y</span>
          <span className="font-semibold">{tenYear != null ? `${tenYear.toFixed(2)}%` : "--"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">2Y</span>
          <span className="font-semibold">{twoYear != null ? `${twoYear.toFixed(2)}%` : "--"}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1">
          <span className="text-text-secondary">Spread</span>
          <span className={`font-semibold ${curve.color}`}>
            {spread != null ? `${spread >= 0 ? "+" : ""}${spread.toFixed(2)}%` : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
