"use client";

import type { FMPQuote } from "@/lib/fmp/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface IndexBarProps {
  voo: FMPQuote | null;
  qqq: FMPQuote | null;
  vtwo: FMPQuote | null;
}

function IndexCard({
  ticker,
  label,
  quote,
}: {
  ticker: string;
  label: string;
  quote: FMPQuote | null;
}) {
  if (!quote) {
    return (
      <div className="rounded-2xl bg-bg-surface p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold">{ticker}</span>
          <span className="text-xs text-text-secondary">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-text-secondary">--</div>
      </div>
    );
  }

  const positive = (quote.changesPercentage ?? 0) >= 0;
  const color = positive ? "text-bullish" : "text-bearish";
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl bg-bg-surface p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold">{ticker}</span>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">
        ${quote.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "--"}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${color}`}>
        <Icon size={14} />
        {quote.changesPercentage != null
          ? `${quote.changesPercentage >= 0 ? "+" : ""}${quote.changesPercentage.toFixed(2)}%`
          : "--"}
      </div>
    </div>
  );
}

export default function IndexBar({ voo, qqq, vtwo }: IndexBarProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <IndexCard ticker="VOO" label="S&P 500" quote={voo} />
      <IndexCard ticker="QQQ" label="Nasdaq 100" quote={qqq} />
      <IndexCard ticker="VTWO" label="Russell 2000" quote={vtwo} />
    </div>
  );
}
