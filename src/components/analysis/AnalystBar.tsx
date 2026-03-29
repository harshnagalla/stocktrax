"use client";

import type { TickerData } from "@/lib/fmp/types";

interface AnalystBarProps {
  data: TickerData;
}

interface RatingSegment {
  label: string;
  count: number;
  color: string;
}

function getConsensus(segments: RatingSegment[]): string {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return "--";

  const strongBuy = segments[0].count;
  const buy = segments[1].count;
  const hold = segments[2].count;
  const sell = segments[3].count;
  const strongSell = segments[4].count;

  const bullish = strongBuy + buy;
  const bearish = sell + strongSell;

  if (bullish > total * 0.6) return "Strong Buy";
  if (bullish > total * 0.4) return "Buy";
  if (bearish > total * 0.6) return "Strong Sell";
  if (bearish > total * 0.4) return "Sell";
  return "Hold";
}

function consensusColor(consensus: string): string {
  if (consensus === "Strong Buy" || consensus === "Buy") return "text-bullish";
  if (consensus === "Strong Sell" || consensus === "Sell") return "text-bearish";
  if (consensus === "Hold") return "text-neutral";
  return "text-text-secondary";
}

export default function AnalystBar({ data }: AnalystBarProps) {
  const rec = data.recommendations;
  const estimates = data.estimates;
  const price = data.quote?.price ?? null;
  const pe = data.quote?.pe ?? null;

  const segments: RatingSegment[] = [
    {
      label: "Strong Buy",
      count: rec?.analystRatingsStrongBuy ?? 0,
      color: "bg-[#15803d]",
    },
    {
      label: "Buy",
      count: rec?.analystRatingsBuy ?? 0,
      color: "bg-bullish",
    },
    {
      label: "Hold",
      count: rec?.analystRatingsHold ?? 0,
      color: "bg-[#9ca3af]",
    },
    {
      label: "Sell",
      count: rec?.analystRatingsSell ?? 0,
      color: "bg-[#f97316]",
    },
    {
      label: "Strong Sell",
      count: rec?.analystRatingsStrongSell ?? 0,
      color: "bg-bearish",
    },
  ];

  const totalAnalysts = segments.reduce((sum, s) => sum + s.count, 0);
  const consensus = getConsensus(segments);

  // Price target: use estimated EPS * PE if available
  let priceTarget: number | null = null;
  if (estimates?.estimatedEpsAvg != null && pe != null && pe > 0) {
    priceTarget = estimates.estimatedEpsAvg * pe;
  }

  let impliedChange: number | null = null;
  if (priceTarget != null && price != null && price > 0) {
    impliedChange = ((priceTarget - price) / price) * 100;
  }

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        Analyst Sentiment
      </h3>

      {totalAnalysts > 0 ? (
        <>
          {/* Stacked bar */}
          <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full">
            {segments.map((seg) => {
              if (seg.count === 0) return null;
              const pct = (seg.count / totalAnalysts) * 100;
              return (
                <div
                  key={seg.label}
                  className={`${seg.color} flex items-center justify-center text-[10px] font-medium text-white`}
                  style={{ width: `${pct}%` }}
                  title={`${seg.label}: ${seg.count}`}
                >
                  {pct >= 10 ? seg.count : ""}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {segments.map(
              (seg) =>
                seg.count > 0 && (
                  <span
                    key={seg.label}
                    className="flex items-center gap-1 text-[10px] text-text-secondary"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${seg.color}`}
                    />
                    {seg.label} ({seg.count})
                  </span>
                )
            )}
          </div>

          {/* Summary row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-text-secondary">Analysts: </span>
              <span className="font-medium text-text-primary">
                {totalAnalysts}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Consensus: </span>
              <span className={`font-semibold ${consensusColor(consensus)}`}>
                {consensus}
              </span>
            </div>
            {priceTarget != null && (
              <div>
                <span className="text-text-secondary">Price Target: </span>
                <span className="font-medium text-text-primary">
                  ${priceTarget.toFixed(2)}
                </span>
              </div>
            )}
            {impliedChange != null && (
              <div>
                <span className="text-text-secondary">Implied: </span>
                <span
                  className={`font-semibold ${impliedChange >= 0 ? "text-bullish" : "text-bearish"}`}
                >
                  {impliedChange >= 0 ? "+" : ""}
                  {impliedChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 text-xs text-text-secondary">
          No analyst data available.
        </div>
      )}
    </div>
  );
}
