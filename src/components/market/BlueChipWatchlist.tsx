"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2, ArrowRight } from "lucide-react";

const BLUE_CHIPS = ["AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "META", "V", "MA", "UNH", "NOW"];

interface ChipQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  signal: string;
  reason: string;
  buyAt: number | null;
  sma50: number;
  sma150: number;
  rsi: number;
}

const SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
};

export default function BlueChipWatchlist() {
  const [quotes, setQuotes] = useState<Record<string, ChipQuote>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/quotes?symbols=${BLUE_CHIPS.join(",")}&analyze=true`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setQuotes(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  function toggleExpand(sym: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  }

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="text-sm font-semibold">Blue Chip Moat Stocks</div>
      <div className="mt-1 mb-3 text-xs text-text-secondary">
        Strong moat companies — Adam Khoo&apos;s picks
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-text-secondary">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      ) : (
        <div className="space-y-1">
          {BLUE_CHIPS.map((sym) => {
            const q = quotes[sym] as ChipQuote | undefined;
            if (!q) return (
              <div key={sym} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="font-bold">{sym}</span>
                <span className="text-text-secondary">--</span>
              </div>
            );

            const isExpanded = expanded.has(sym);
            const positive = q.changePercent >= 0;
            const signal = q.signal ?? "HOLD";
            const style = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.HOLD;

            return (
              <div key={sym} className="rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(sym)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{sym}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${style.bg} ${style.text}`}>
                      {signal}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">${q.price.toFixed(2)}</span>
                    <span className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                      {positive ? "+" : ""}{q.changePercent.toFixed(1)}%
                    </span>
                    {isExpanded ? <ChevronUp size={12} className="text-text-secondary" /> : <ChevronDown size={12} className="text-text-secondary" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-3 py-2.5 space-y-2">
                    <div className={`rounded-lg p-2.5 text-xs leading-relaxed ${style.bg}`}>
                      <span className={`font-bold ${style.text}`}>{signal}: </span>
                      <span>{q.reason}</span>
                    </div>
                    {q.buyAt && (
                      <div className="text-xs">
                        <span className="font-bold text-bullish">Buy at: </span>${q.buyAt}
                      </div>
                    )}
                    <div className="flex gap-3 text-[10px] text-text-secondary">
                      <span>50 SMA: <strong className="text-text-primary">${q.sma50?.toFixed(0)}</strong></span>
                      <span>150 SMA: <strong className="text-text-primary">${q.sma150?.toFixed(0)}</strong></span>
                      <span>RSI: <strong className="text-text-primary">{q.rsi}</strong></span>
                    </div>
                    <Link
                      href={`/stock/${sym}`}
                      className="flex items-center justify-center gap-1 rounded-lg bg-info/10 py-2 text-xs font-medium text-info hover:bg-info/20"
                    >
                      Full Analysis <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
