"use client";

import type { TickerData } from "@/lib/fmp/types";
import { extractIndicatorValues } from "@/lib/market-utils";

interface RSIGaugeProps {
  data: TickerData;
}

const zones = [
  { min: 0, max: 30, label: "Oversold", bg: "bg-bullish/30", text: "text-bullish" },
  { min: 30, max: 40, label: "Approaching Oversold", bg: "bg-bullish/15", text: "text-bullish" },
  { min: 40, max: 60, label: "Neutral", bg: "bg-border", text: "text-text-secondary" },
  { min: 60, max: 70, label: "Approaching Overbought", bg: "bg-neutral/20", text: "text-neutral" },
  { min: 70, max: 100, label: "Overbought", bg: "bg-bearish/30", text: "text-bearish" },
];

function getZone(rsi: number) {
  return zones.find((z) => rsi >= z.min && rsi < z.max) ?? zones[zones.length - 1];
}

export default function RSIGauge({ data }: RSIGaugeProps) {
  const rsiValues = extractIndicatorValues(data.rsi, "rsi");
  const rsi = rsiValues.length > 0 ? rsiValues[0] : null;

  const zone = rsi != null ? getZone(rsi) : null;
  const markerLeft = rsi != null ? Math.min(Math.max(rsi, 1), 99) : 50;

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">RSI (14)</h3>
        {rsi != null && (
          <span className={`text-lg font-bold ${zone?.text ?? "text-text-primary"}`}>
            {rsi.toFixed(1)}
          </span>
        )}
      </div>

      {/* Gauge bar */}
      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full">
        {zones.map((z) => (
          <div
            key={z.label}
            className={z.bg}
            style={{ width: `${z.max - z.min}%` }}
          />
        ))}
      </div>

      {/* Marker */}
      {rsi != null && (
        <div className="relative mt-0">
          <div
            className="absolute -top-3 h-4 w-0.5 bg-text-primary"
            style={{ left: `${markerLeft}%` }}
          />
          <div
            className="absolute -top-4 h-3 w-3 -translate-x-1/2 rounded-full bg-text-primary ring-2 ring-bg-surface"
            style={{ left: `${markerLeft}%` }}
          />
        </div>
      )}

      {/* Zone labels */}
      <div className="mt-4 flex justify-between text-[10px] text-text-secondary">
        <span>0</span>
        <span>30</span>
        <span>50</span>
        <span>70</span>
        <span>100</span>
      </div>

      {/* Current zone label */}
      {zone && rsi != null && (
        <div className={`mt-2 text-center text-xs font-medium ${zone.text}`}>
          {zone.label}
        </div>
      )}

      {rsi == null && (
        <div className="mt-3 text-center text-xs text-text-secondary">
          RSI data unavailable
        </div>
      )}
    </div>
  );
}
