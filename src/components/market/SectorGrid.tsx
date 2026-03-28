"use client";

import type { FMPSectorPerformance } from "@/lib/fmp/types";

interface SectorGridProps {
  sectors: FMPSectorPerformance[];
}

export default function SectorGrid({ sectors }: SectorGridProps) {
  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4 text-xs text-text-secondary">
        No sector data
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-3 text-xs text-text-secondary">
        Sector Performance
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {sectors.map((s) => {
          const pct = parseFloat(s.changesPercentage.replace("%", ""));
          const positive = pct >= 0;
          return (
            <div
              key={s.sector}
              className={`rounded px-2 py-1.5 text-xs ${
                positive
                  ? "bg-bullish/10 text-bullish"
                  : "bg-bearish/10 text-bearish"
              }`}
            >
              <div className="truncate font-medium text-text-primary text-[10px]">
                {s.sector}
              </div>
              <div className="font-bold">
                {positive ? "+" : ""}
                {pct.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
