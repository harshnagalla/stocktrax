"use client";

import type { StockQuote } from "@/lib/data-service";

interface TreasuryCardProps {
  tnx: StockQuote | null;
}

export default function TreasuryCard({ tnx }: TreasuryCardProps) {
  const tenYear = tnx?.price ?? null;

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="text-xs font-medium text-text-secondary">10Y Treasury</div>
      <div className="mt-1 text-2xl font-bold">
        {tenYear != null ? `${tenYear.toFixed(2)}%` : "--"}
      </div>
      {tnx && (
        <div className={`mt-1 text-xs font-semibold ${tnx.changePercent >= 0 ? "text-bearish" : "text-bullish"}`}>
          {tnx.changePercent >= 0 ? "+" : ""}{tnx.changePercent.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
