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
    .slice(0, 7);

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-3 text-xs text-text-secondary">
        Economic Calendar
      </div>

      {upcoming.length === 0 ? (
        <div className="text-xs text-text-secondary">No upcoming events</div>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map((e, i) => (
            <div key={`${e.date}-${e.event}-${i}`} className="flex items-start gap-2 text-xs">
              <div className="flex items-center gap-1 shrink-0 w-20">
                {e.impact === "High" && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-bearish shrink-0" />
                )}
                <span className="text-text-secondary text-[10px]">
                  {e.date.slice(5)}
                </span>
              </div>
              <div className="flex-1 truncate text-text-primary">
                {e.event}
              </div>
              <div className="shrink-0 text-right text-[10px] text-text-secondary w-24">
                {e.actual != null && (
                  <span className="text-text-primary">{e.actual}</span>
                )}
                {e.estimate != null && (
                  <span className="ml-1">est: {e.estimate}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
