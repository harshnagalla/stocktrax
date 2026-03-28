"use client";

import type { FMPQuote } from "@/lib/fmp/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface IndexBarProps {
  sp500: FMPQuote | null;
  nasdaq: FMPQuote | null;
  dowJones: FMPQuote | null;
  russell: FMPQuote | null;
}

function IndexCard({ label, quote }: { label: string; quote: FMPQuote | null }) {
  if (!quote) {
    return (
      <div className="rounded border border-border bg-bg-surface px-3 py-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="ml-2 text-xs text-text-secondary">--</span>
      </div>
    );
  }

  const positive = (quote.changesPercentage ?? 0) >= 0;
  const color = positive ? "text-bullish" : "text-bearish";
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2 rounded border border-border bg-bg-surface px-3 py-2">
      <span className="text-xs font-medium text-text-primary">{label}</span>
      <span className="text-xs text-text-primary">
        {quote.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "--"}
      </span>
      <span className={`flex items-center gap-0.5 text-xs ${color}`}>
        <Icon size={12} />
        {quote.changesPercentage != null
          ? `${quote.changesPercentage >= 0 ? "+" : ""}${quote.changesPercentage.toFixed(2)}%`
          : "--"}
      </span>
    </div>
  );
}

export default function IndexBar({ sp500, nasdaq, dowJones, russell }: IndexBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <IndexCard label="S&P 500" quote={sp500} />
      <IndexCard label="Nasdaq" quote={nasdaq} />
      <IndexCard label="Dow Jones" quote={dowJones} />
      <IndexCard label="Russell 2000" quote={russell} />
    </div>
  );
}
