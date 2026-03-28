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
    spxPrice,
    currentSma50,
    currentSma150,
    currentSma200,
    slope50,
    slope150,
    slope200
  );

  const hasData = spxPrice > 0 && currentSma50 > 0;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-2 text-xs text-text-secondary">
        S&P 500 Trend — Adam Khoo Method
      </div>

      {hasData ? (
        <>
          <div className={`text-lg font-bold ${regime.color}`}>
            {regime.regime}
          </div>
          <div className="mt-1 mb-3">
            <span
              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                regime.bias === "LONG"
                  ? "bg-bullish/20 text-bullish"
                  : regime.bias === "SHORT"
                    ? "bg-bearish/20 text-bearish"
                    : "bg-neutral/20 text-neutral"
              }`}
            >
              Bias: {regime.bias}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">SPX</span>
              <span className="text-text-primary">
                {spxPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">50 SMA</span>
              <span className="text-text-primary">
                {currentSma50.toFixed(2)} {getSlopeArrow(slope50)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">150 SMA</span>
              <span className="text-text-primary">
                {currentSma150.toFixed(2)} {getSlopeArrow(slope150)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">200 SMA</span>
              <span className="text-text-primary">
                {currentSma200.toFixed(2)} {getSlopeArrow(slope200)}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-text-secondary">--</div>
      )}
    </div>
  );
}
