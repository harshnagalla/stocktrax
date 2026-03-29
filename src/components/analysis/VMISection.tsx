"use client";

import type { TickerData } from "@/lib/fmp/types";
import { calculateVMIScore } from "@/lib/vmi-scoring";
import VMIGauge from "./VMIGauge";
import FundamentalScoreboard from "./FundamentalScoreboard";
import ValuationDashboard from "./ValuationDashboard";

interface VMISectionProps {
  data: TickerData;
}

export default function VMISection({ data }: VMISectionProps) {
  const score = calculateVMIScore(data);

  return (
    <div className="space-y-4">
      {/* VMI Score Gauge */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          VMI Score
        </h2>
        <VMIGauge score={score} />
      </div>

      {/* Fundamental Scoreboard */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <FundamentalScoreboard criteria={score.criteria} />
      </div>

      {/* Valuation Dashboard */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <ValuationDashboard data={data} />
      </div>
    </div>
  );
}
