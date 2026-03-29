"use client";

import type { TickerData } from "@/lib/fmp/types";
import TrendCard from "./TrendCard";
import TradingSignalCard from "./TradingSignalCard";
import MADashboard from "./MADashboard";
import RSIGauge from "./RSIGauge";

interface TechnicalSectionProps {
  data: TickerData;
}

export default function TechnicalSection({ data }: TechnicalSectionProps) {
  return (
    <div className="space-y-4">
      {/* Top row: Trend + Trading Signal side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrendCard data={data} />
        <TradingSignalCard data={data} />
      </div>

      {/* MA Dashboard */}
      <MADashboard data={data} />

      {/* RSI Gauge */}
      <RSIGauge data={data} />
    </div>
  );
}
