"use client";

import { getSlopeArrow, type MarketRegime } from "@/lib/market-utils";

interface SpxTrendCardProps {
  regime: MarketRegime;
  spxPrice: number;
  sma50: number;
  sma150: number;
  sma200: number;
  slope50: number;
  slope150: number;
  slope200: number;
}

export default function SpxTrendCard({
  regime, spxPrice, sma50, sma150, sma200, slope50, slope150, slope200,
}: SpxTrendCardProps) {
  const hasData = spxPrice > 0 && sma50 > 0;

  const biasColors: Record<string, string> = {
    LONG: "bg-bullish/15 text-bullish",
    SHORT: "bg-bearish/15 text-bearish",
    "NEUTRAL/CASH": "bg-neutral/15 text-neutral",
  };

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="text-xs font-medium text-text-secondary">S&P 500 Trend</div>
      {hasData ? (
        <>
          <div className={`mt-1 text-lg font-bold ${regime.color}`}>{regime.regime}</div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${biasColors[regime.bias]}`}>
            {regime.bias}
          </span>
          <div className="mt-3 space-y-1 text-xs">
            {[
              { label: "50 SMA", val: sma50, slope: slope50 },
              { label: "150 SMA", val: sma150, slope: slope150 },
              { label: "200 SMA", val: sma200, slope: slope200 },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-text-secondary">{row.label}</span>
                <span className="font-semibold">{row.val.toFixed(0)} {getSlopeArrow(row.slope)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-1 text-lg font-bold text-text-secondary">--</div>
      )}
    </div>
  );
}
