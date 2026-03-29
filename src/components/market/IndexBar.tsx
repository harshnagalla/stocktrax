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
      <div className="rounded-2xl bg-bg-surface p-3">
        <div className="text-xs font-medium text-text-secondary">{label}</div>
        <div className="mt-1 text-lg font-semibold text-text-secondary">--</div>
      </div>
    );
  }

  const positive = (quote.changesPercentage ?? 0) >= 0;
  const color = positive ? "text-bullish" : "text-bearish";
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl bg-bg-surface p-3">
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className="mt-1 text-lg font-bold text-text-primary">
        ${quote.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "--"}
      </div>
      <div className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${color}`}>
        <Icon size={12} />
        {quote.changesPercentage != null
          ? `${quote.changesPercentage >= 0 ? "+" : ""}${quote.changesPercentage.toFixed(2)}%`
          : "--"}
      </div>
    </div>
  );
}

export default function IndexBar({ sp500, nasdaq, dowJones, russell }: IndexBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <IndexCard label="S&P 500" quote={sp500} />
      <IndexCard label="Nasdaq" quote={nasdaq} />
      <IndexCard label="Dow Jones" quote={dowJones} />
      <IndexCard label="Russell 2000" quote={russell} />
    </div>
  );
}
