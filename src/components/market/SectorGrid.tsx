"use client";

import type { FMPSectorPerformance } from "@/lib/fmp/types";

interface SectorGridProps {
  sectors: FMPSectorPerformance[];
}

export default function SectorGrid({ sectors }: SectorGridProps) {
  if (sectors.length === 0) return null;

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="mb-3 text-xs font-medium text-text-secondary">Sectors</div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {sectors.map((s) => {
          const pct = parseFloat(s.changesPercentage.replace("%", ""));
          const positive = pct >= 0;
          return (
            <div
              key={s.sector}
              className={`rounded-lg px-2.5 py-2 ${positive ? "bg-bullish/8" : "bg-bearish/8"}`}
            >
              <div className="truncate text-[10px] text-text-secondary">{s.sector}</div>
              <div className={`text-sm font-bold ${positive ? "text-bullish" : "text-bearish"}`}>
                {positive ? "+" : ""}{pct.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
