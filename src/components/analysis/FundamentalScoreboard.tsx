"use client";

import type { VMICriterion } from "@/lib/vmi-scoring";

interface FundamentalScoreboardProps {
  criteria: VMICriterion[];
}

function barColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.7) return "bg-bullish";
  if (ratio >= 0.4) return "bg-neutral";
  return "bg-bearish";
}

export default function FundamentalScoreboard({
  criteria,
}: FundamentalScoreboardProps) {
  // criteria 0-6 are the 7 business quality criteria
  const businessCriteria = criteria.slice(0, 7);

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-text-primary">
        Business Quality
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {businessCriteria.map((c) => {
          const pct = c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0;
          return (
            <div
              key={c.name}
              className="rounded-xl border border-border bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  {c.name}
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  {c.score}/{c.maxScore}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full transition-all ${barColor(c.score, c.maxScore)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-text-secondary">
                {c.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
