"use client";

import type { TickerData } from "@/lib/fmp/types";
import { assessTrend, calculateTradingSignal } from "@/lib/technical-utils";
import { extractIndicatorValues } from "@/lib/market-utils";

interface ProfitSnapperVerdictProps {
  data: TickerData;
}

const signalBg: Record<string, string> = {
  "Strong Buy": "bg-bullish text-white",
  Buy: "bg-bullish/80 text-white",
  Watch: "bg-neutral text-white",
  Neutral: "bg-border text-text-primary",
  Avoid: "bg-bearish text-white",
};

function getEntryTiming(
  rsi: number | null,
  trendLabel: string
): { label: string; color: string } {
  const isUptrend =
    trendLabel === "Strong Uptrend" || trendLabel === "Uptrend";
  const isDowntrend =
    trendLabel === "Downtrend" || trendLabel === "Strong Downtrend";

  if (isDowntrend) {
    return {
      label: "Not Ideal — Wait for Trend Reversal",
      color: "text-bearish",
    };
  }

  if (rsi == null) {
    return { label: "Monitor — No Clear Setup", color: "text-text-secondary" };
  }

  if (rsi > 70) {
    return { label: "Overbought — Wait for Pullback", color: "text-neutral" };
  }

  if (isUptrend && rsi >= 40 && rsi <= 55) {
    return { label: "Ideal Entry Zone", color: "text-bullish" };
  }

  if (isUptrend && rsi >= 30 && rsi < 40) {
    return {
      label: "Pullback Entry — Watch for Bounce",
      color: "text-neutral",
    };
  }

  return { label: "Monitor — No Clear Setup", color: "text-text-secondary" };
}

export default function ProfitSnapperVerdict({
  data,
}: ProfitSnapperVerdictProps) {
  const tradingSignal = calculateTradingSignal(data);
  const trendAssessment = assessTrend(data);
  const rsiValues = extractIndicatorValues(data.rsi ?? [], "rsi");
  const rsi = rsiValues.length > 0 ? rsiValues[0] : null;

  const entryTiming = getEntryTiming(rsi, trendAssessment.trend);

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        Profit Snapper Trading Verdict
      </h3>

      {/* Signal badge + trend */}
      <div className="mt-4 flex items-center gap-4">
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${signalBg[tradingSignal.signal] ?? "bg-border text-text-primary"}`}
        >
          {tradingSignal.signal}
        </span>
        <span className={`text-sm font-semibold ${trendAssessment.color}`}>
          {trendAssessment.trend}
        </span>
      </div>

      {/* Entry Timing */}
      <div className="mt-4">
        <div className="mb-1 text-xs text-text-secondary">Entry Timing</div>
        <div className={`text-sm font-semibold ${entryTiming.color}`}>
          {entryTiming.label}
        </div>
        {rsi != null && (
          <div className="mt-1 text-xs text-text-secondary">
            RSI: {rsi.toFixed(1)}
          </div>
        )}
      </div>

      {/* Key Reasons */}
      {tradingSignal.reasons.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-text-primary">
            Key Reasons
          </div>
          <ul className="space-y-1">
            {tradingSignal.reasons.map((reason, i) => (
              <li key={i} className="text-xs text-text-secondary">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
