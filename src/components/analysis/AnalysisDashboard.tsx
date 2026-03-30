"use client";

import type { TickerAnalysis } from "@/app/page";
import StockHeader from "./StockHeader";

interface AnalysisDashboardProps {
  tickerData: TickerAnalysis[];
}

export default function AnalysisDashboard({ tickerData }: AnalysisDashboardProps) {
  return (
    <div className="space-y-6">
      {tickerData.map((data) => (
        <div key={data.quote.symbol} className="space-y-4">
          <StockHeader data={data} />
          <div className="rounded-2xl bg-bg-surface p-5 text-center text-xs text-text-secondary">
            VMI Score + Analysis — coming soon
          </div>
        </div>
      ))}
    </div>
  );
}
