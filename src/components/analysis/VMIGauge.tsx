"use client";

import type { VMIScore } from "@/lib/vmi-scoring";

interface VMIGaugeProps {
  score: VMIScore;
}

export default function VMIGauge({ score }: VMIGaugeProps) {
  const { total, label, color, businessQuality, valuation, momentum } = score;

  // Semi-circle SVG gauge
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc from 180deg (left) to 0deg (right) — a semi-circle
  const startAngle = Math.PI; // 180 deg
  const endAngle = 0; // 0 deg
  const sweepAngle = startAngle - endAngle;
  const scoreAngle = startAngle - (total / 100) * sweepAngle;

  const arcX = (angle: number) => cx + radius * Math.cos(angle);
  const arcY = (angle: number) => cy - radius * Math.sin(angle);

  // Background arc path (full semi-circle)
  const bgPath = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${radius} ${radius} 0 1 1 ${arcX(endAngle)} ${arcY(endAngle)}`;

  // Score arc path
  const largeArc = total > 50 ? 1 : 0;
  const scorePath =
    total > 0
      ? `M ${arcX(startAngle)} ${arcY(startAngle)} A ${radius} ${radius} 0 ${largeArc} 1 ${arcX(scoreAngle)} ${arcY(scoreAngle)}`
      : "";

  // Color for the arc based on score
  function arcColor(s: number): string {
    if (s >= 80) return "var(--color-bullish)";
    if (s >= 60) return "var(--color-bullish)";
    if (s >= 40) return "var(--color-neutral)";
    if (s >= 20) return "var(--color-bearish)";
    return "var(--color-bearish)";
  }

  // Proportion bar
  const bqMax = 60;
  const valMax = 20;
  const momMax = 20;
  const bqPct = (businessQuality / bqMax) * 100;
  const valPct = (valuation / valMax) * 100;
  const momPct = (momentum / momMax) * 100;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size / 2 + 16 }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        >
          {/* Background track */}
          <path
            d={bgPath}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Score arc */}
          {total > 0 && (
            <path
              d={scorePath}
              fill="none"
              stroke={arcColor(total)}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
        </svg>
        {/* Score text in center */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-1"
        >
          <span className="text-3xl font-bold text-text-primary">
            {total}
          </span>
          <span className={`text-sm font-semibold ${color}`}>{label}</span>
        </div>
      </div>

      {/* Breakdown bar */}
      <div className="w-full">
        <div className="mb-1.5 flex justify-between text-[10px] text-text-secondary">
          <span>Business Quality ({businessQuality}/60)</span>
          <span>Valuation ({valuation}/20)</span>
          <span>Momentum ({momentum}/20)</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-info transition-all"
            style={{ width: `${(businessQuality / 100) * 100}%` }}
            title={`Business Quality: ${businessQuality}/60`}
          />
          <div
            className="h-full bg-neutral transition-all"
            style={{ width: `${(valuation / 100) * 100}%` }}
            title={`Valuation: ${valuation}/20`}
          />
          <div
            className="h-full bg-bullish transition-all"
            style={{ width: `${(momentum / 100) * 100}%` }}
            title={`Momentum: ${momentum}/20`}
          />
        </div>
        <div className="mt-1 flex gap-3 text-[10px] text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-info" />
            Quality
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-neutral" />
            Valuation
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-bullish" />
            Momentum
          </span>
        </div>
      </div>
    </div>
  );
}
