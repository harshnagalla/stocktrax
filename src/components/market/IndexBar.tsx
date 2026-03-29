"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface QuoteData {
  price: number;
  changePercent: number;
  signal?: string;
  reason?: string;
}

interface IndexBarProps {
  voo: QuoteData | undefined;
  qqq: QuoteData | undefined;
  vtwo: QuoteData | undefined;
}

const SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
};

function IndexCard({ ticker, label, quote }: { ticker: string; label: string; quote: QuoteData | undefined }) {
  if (!quote) {
    return (
      <div className="rounded-2xl bg-bg-surface p-4">
        <div className="text-sm font-bold">{ticker}</div>
        <div className="mt-1 text-xl font-bold text-text-secondary">--</div>
      </div>
    );
  }

  const positive = quote.changePercent >= 0;
  const color = positive ? "text-bullish" : "text-bearish";
  const Icon = positive ? TrendingUp : TrendingDown;
  const signal = quote.signal ?? "HOLD";
  const style = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.HOLD;

  return (
    <div className="rounded-2xl bg-bg-surface p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold">{ticker}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${style.bg} ${style.text}`}>
          {signal}
        </span>
      </div>
      <div className="text-[10px] text-text-secondary">{label}</div>
      <div className="mt-1 text-xl font-bold">${quote.price.toFixed(2)}</div>
      <div className={`mt-0.5 flex items-center gap-0.5 text-xs font-semibold ${color}`}>
        <Icon size={12} />
        {positive ? "+" : ""}{quote.changePercent.toFixed(2)}%
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
