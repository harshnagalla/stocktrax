"use client";

import type { TickerData } from "@/lib/fmp/types";
import StockHeader from "./StockHeader";
import VMISection from "./VMISection";
import TechnicalSection from "./TechnicalSection";
import VerdictSection from "./VerdictSection";
import ComparisonTable from "./ComparisonTable";

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

          {/* VMI Score Engine — Phase 4 */}
          <VMISection data={data} />

          {/* Technical Analysis — Phase 5 */}
          <TechnicalSection data={data} />

          {/* Verdicts & Analyst Sentiment — Phase 6 */}
          <VerdictSection data={data} />
        </div>
      ))}

      {/* Side-by-Side Comparison (only when 2+ tickers) */}
      <ComparisonTable tickerData={tickerData} />
    </div>
  );
}
