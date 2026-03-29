"use client";

import type { FMPEconomicEvent } from "@/lib/fmp/types";

interface EconomicCalendarProps {
  events: FMPEconomicEvent[];
}

export default function EconomicCalendar({ events }: EconomicCalendarProps) {
  const today = new Date().toISOString().split("T")[0];

  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="mb-3 text-xs font-medium text-text-secondary">Economic Calendar</div>
      <div className="space-y-2">
        {upcoming.map((e, i) => (
          <div key={`${e.date}-${i}`} className="flex items-center gap-2 text-xs">
            {e.impact === "High" && (
              <span className="h-1.5 w-1.5 rounded-full bg-bearish shrink-0" />
            )}
            {e.impact !== "High" && (
              <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0" />
            )}
            <span className="shrink-0 text-text-secondary w-12">{e.date.slice(5)}</span>
            <span className="flex-1 truncate font-medium">{e.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
