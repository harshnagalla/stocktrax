"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown, Zap, ArrowRight } from "lucide-react";

// Small cap / momentum plays — update this list as needed
const SMALL_CAPS = [
  "SSRM", "CDE", "TIGO", "GOLD", "NEM",
  "KGC", "AEM", "WPM", "FNV", "PAAS",
];

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sma50?: number;
  sma150?: number;
  rsi?: number;
  signal?: string;
  reason?: string;
}

const SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
};

export default function SmallCapPlays() {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quotes?symbols=${SMALL_CAPS.join(",")}&analyze=true`)
      .then((r) => r.json())
      .then(setQuotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sort by changePercent descending
  const sorted = Object.values(quotes)
    .filter((q): q is QuoteData => !!q && typeof q.price === "number")
    .sort((a, b) => b.changePercent - a.changePercent);

  return (
    <div>
      <div className="mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-neutral" />
          <span className="text-sm font-semibold">Small Cap Plays</span>
        </div>
        <div className="text-xs text-text-secondary">Mining & momentum — higher risk, higher reward</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-8 text-text-secondary">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((q) => {
            const positive = q.changePercent >= 0;
            const signal = q.signal ?? "HOLD";
            const style = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.HOLD;

            return (
              <Link
                key={q.symbol}
                href={`/stock/${q.symbol}`}
                className="flex items-center justify-between rounded-2xl bg-bg-surface p-4 transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{q.symbol}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${style.bg} ${style.text}`}>
                      {signal}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-secondary">{q.name}</div>
                  {q.reason && (
                    <div className="mt-1 text-[10px] text-text-secondary">{q.reason}</div>
                  )}
                  {q.rsi != null && q.sma50 != null && (
                    <div className="mt-1 flex gap-2 text-[9px] text-text-secondary">
                      <span>RSI <strong className={q.rsi < 30 ? "text-bearish" : q.rsi > 70 ? "text-bullish" : "text-text-primary"}>{q.rsi}</strong></span>
                      <span>50 SMA <strong className="text-text-primary">${q.sma50.toFixed(0)}</strong></span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-base font-bold">${q.price.toFixed(2)}</div>
                    <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {positive ? "+" : ""}{q.changePercent.toFixed(1)}%
                    </div>
                  </div>
                  <ArrowRight size={12} className="text-text-secondary" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
