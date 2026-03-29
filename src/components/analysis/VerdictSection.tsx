"use client";

import type { TickerData } from "@/lib/fmp/types";
import VMIVerdict from "./VMIVerdict";
import ProfitSnapperVerdict from "./ProfitSnapperVerdict";
import AnalystBar from "./AnalystBar";

interface VerdictSectionProps {
  data: TickerData;
}

export default function VerdictSection({ data }: VerdictSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <VMIVerdict data={data} />
        <ProfitSnapperVerdict data={data} />
      </div>
      <AnalystBar data={data} />
    </div>
  );
}
