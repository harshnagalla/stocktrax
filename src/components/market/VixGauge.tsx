"use client";

import type { FMPQuote } from "@/lib/fmp/types";
import { AlertTriangle } from "lucide-react";

interface VixGaugeProps {
  vix: FMPQuote | null;
}

function getVixZone(level: number): { label: string; color: string; bgClass: string } {
  if (level > 40) return { label: "Extreme Panic", color: "text-bearish", bgClass: "border-bearish/40" };
  if (level > 30) return { label: "High Fear", color: "text-bearish", bgClass: "border-bearish/30" };
  if (level > 20) return { label: "Elevated", color: "text-neutral", bgClass: "border-neutral/30" };
  if (level > 15) return { label: "Normal", color: "text-info", bgClass: "border-info/30" };
  return { label: "Low Volatility", color: "text-bullish", bgClass: "border-bullish/30" };
}

export default function VixGauge({ vix }: VixGaugeProps) {
  const level = vix?.price ?? 0;
  const zone = getVixZone(level);
  const changePercent = vix?.changesPercentage;

  return (
    <div className={`rounded-lg border bg-bg-surface p-4 ${zone.bgClass}`}>
      <div className="mb-2 flex items-center gap-1.5 text-xs text-text-secondary">
        <AlertTriangle size={12} />
        VIX — Fear Gauge
      </div>

      {vix ? (
        <>
          <div className={`text-3xl font-bold ${zone.color}`}>
            {level.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-xs font-medium ${zone.color}`}>
              {zone.label}
            </span>
            {changePercent != null && (
              <span
                className={`text-[10px] ${changePercent >= 0 ? "text-bearish" : "text-bullish"}`}
              >
                {changePercent >= 0 ? "+" : ""}
                {changePercent.toFixed(2)}%
              </span>
            )}
          </div>
          {level > 35 && (
            <p className="mt-2 text-[10px] text-text-secondary">
              VIX &gt; 35 historically correlates with market bottoms 82% of
              the time
            </p>
          )}
        </>
      ) : (
        <div className="text-xl text-text-secondary">--</div>
      )}
    </div>
  );
}
