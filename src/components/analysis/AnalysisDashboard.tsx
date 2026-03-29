"use client";

import type { TickerData } from "@/lib/fmp/types";
import StockHeader from "./StockHeader";

interface AnalysisDashboardProps {
  tickerData: TickerData[];
}

export default function AnalysisDashboard({
  tickerData,
}: AnalysisDashboardProps) {
  return (
    <div className="space-y-6">
      {tickerData.map((data) => (
        <div key={data.ticker} className="space-y-4">
          <StockHeader data={data} />

          {/* Placeholder sections for future phases */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-surface p-4 text-center text-xs text-text-secondary">
              VMI Score — Phase 4
            </div>
            <div className="rounded-lg border border-border bg-bg-surface p-4 text-center text-xs text-text-secondary">
              Technical Analysis — Phase 5
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg-surface p-4 text-center text-xs text-text-secondary">
            Adam Khoo Verdict — Phase 6
          </div>
        </div>
      ))}
    </div>
  );
}
