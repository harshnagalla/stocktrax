"use client";

import type { FMPHistoricalPrice, FMPTechnicalIndicator } from "@/lib/fmp/types";
import {
  calculateSlope,
  extractIndicatorValues,
  getMarketRegime,
  getSlopeArrow,
} from "@/lib/market-utils";

interface SpxTrendCardProps {
  spxHistory: FMPHistoricalPrice[];
  spxSma50: FMPTechnicalIndicator[];
  spxSma150: FMPTechnicalIndicator[];
  spxSma200: FMPTechnicalIndicator[];
}

export default function SpxTrendCard({
  spxHistory,
  spxSma50,
  spxSma150,
  spxSma200,
}: SpxTrendCardProps) {
  const spxPrice = spxHistory[0]?.close ?? 0;
  const sma50Values = extractIndicatorValues(spxSma50, "sma");
  const sma150Values = extractIndicatorValues(spxSma150, "sma");
  const sma200Values = extractIndicatorValues(spxSma200, "sma");

  const currentSma50 = sma50Values[0] ?? 0;
  const currentSma150 = sma150Values[0] ?? 0;
  const currentSma200 = sma200Values[0] ?? 0;

  const slope50 = calculateSlope(sma50Values);
  const slope150 = calculateSlope(sma150Values);
  const slope200 = calculateSlope(sma200Values);

  const regime = getMarketRegime(
    spxPrice, currentSma50, currentSma150, currentSma200,
    slope50, slope150, slope200
  );

  const hasData = spxPrice > 0 && currentSma50 > 0;

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
          <div className={`mt-1 text-lg font-bold ${regime.color}`}>
            {regime.regime}
          </div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${biasColors[regime.bias]}`}>
            {regime.bias}
          </span>

          <div className="mt-3 space-y-1 text-xs">
            {[
              { label: "50 SMA", val: currentSma50, slope: slope50 },
              { label: "150 SMA", val: currentSma150, slope: slope150 },
              { label: "200 SMA", val: currentSma200, slope: slope200 },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-text-secondary">{row.label}</span>
                <span className="font-semibold">
                  {row.val.toFixed(0)} {getSlopeArrow(row.slope)}
                </span>
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
