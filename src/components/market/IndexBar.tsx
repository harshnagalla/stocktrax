"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface QuoteData {
  symbol?: string;
  name?: string;
  price: number;
  changePercent: number;
  signal?: string;
  reason?: string;
  sma50?: number;
  sma150?: number;
  rsi?: number;
  buyAt?: number | null;
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
    <Link href={`/stock/${ticker}`} className="block rounded-2xl bg-bg-surface p-4 transition-all hover:shadow-md active:scale-[0.98]">
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

      {/* Analysis details */}
      <div className="mt-2 space-y-1 text-[10px] text-text-secondary">
        {quote.rsi != null && (
          <div className="flex justify-between">
            <span>RSI</span>
            <span className={`font-bold ${quote.rsi < 30 ? "text-bearish" : quote.rsi > 70 ? "text-bullish" : "text-text-primary"}`}>
              {quote.rsi} {quote.rsi < 30 ? "oversold" : quote.rsi > 70 ? "overbought" : ""}
            </span>
          </div>
        )}
        {quote.sma50 != null && (
          <div className="flex justify-between">
            <span>50 SMA</span>
            <span className={`font-bold ${quote.price > quote.sma50 ? "text-bullish" : "text-bearish"}`}>
              ${quote.sma50.toFixed(0)} {quote.price > quote.sma50 ? "↑" : "↓"}
            </span>
          </div>
        )}
      </div>
      {quote.reason && (
        <div className="mt-1.5 text-[10px] text-text-secondary leading-relaxed">{quote.reason}</div>
      )}
      <div className="mt-1.5 flex items-center justify-end text-[9px] text-info">
        Details <ArrowRight size={8} className="ml-0.5" />
      </div>
    </Link>
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
