"use client";

import type { TickerData } from "@/lib/fmp/types";
import { assessTrend, detectCrosses } from "@/lib/technical-utils";

interface TrendCardProps {
  data: TickerData;
}

export default function TrendCard({ data }: TrendCardProps) {
  const trend = assessTrend(data);
  const crosses = detectCrosses(data);

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        Trend Assessment
      </h3>

      <div className={`mt-3 text-xl font-bold ${trend.color}`}>
        {trend.trend}
      </div>

      <ul className="mt-3 space-y-1">
        {trend.details.map((detail, i) => (
          <li key={i} className="text-xs text-text-secondary">
            {detail}
          </li>
        ))}
      </ul>

      {crosses.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {crosses.map((cross) => (
            <span
              key={cross.pair}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                cross.type === "Golden Cross"
                  ? "bg-bullish/10 text-bullish"
                  : "bg-bearish/10 text-bearish"
              }`}
            >
              {cross.type} ({cross.pair})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
