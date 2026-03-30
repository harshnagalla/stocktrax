"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown, Shield, ArrowRight, RefreshCw } from "lucide-react";

interface ScreenResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  score: number;
  signal: string;
  reason: string;
}

interface ScreenData {
  total: number;
  strongBuys: number;
  buys: number;
  results: ScreenResult[];
}

const SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  "STRONG BUY": { bg: "bg-bullish/15", text: "text-bullish" },
  BUY: { bg: "bg-bullish/10", text: "text-bullish" },
  WATCH: { bg: "bg-neutral/10", text: "text-neutral" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  AVOID: { bg: "bg-bearish/10", text: "text-bearish" },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-bullish" : score >= 50 ? "bg-info" : score >= 35 ? "bg-neutral" : "bg-bearish";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="w-5 text-right text-[10px] font-bold">{score}</span>
    </div>
  );
}

export default function ScreenerDashboard() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  function fetchData() {
    setLoading(true);
    fetch("/api/screener")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="text-sm font-semibold">Stock Screener</div>
          <div className="text-xs text-text-secondary">Scanning ~70 S&P 500 stocks using Adam Khoo&apos;s 7-Step Formula...</div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Scanning stocks... this takes ~30 seconds</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-bg-surface p-8 text-center text-sm text-text-secondary">
        Failed to load screener data
      </div>
    );
  }

  const filtered = filter === "all"
    ? data.results
    : data.results.filter((r) => r.signal === filter);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Adam Khoo Stock Screener</div>
            <div className="text-xs text-text-secondary">
              {data.total} stocks scanned · {data.strongBuys} strong buys · {data.buys} buys
            </div>
          </div>
          <button
            onClick={fetchData}
            className="rounded-full p-2 text-text-secondary hover:bg-white transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { id: "all", label: `All (${data.total})` },
            { id: "STRONG BUY", label: `Strong Buy (${data.strongBuys})` },
            { id: "BUY", label: `Buy (${data.buys})` },
            { id: "WATCH", label: "Watch" },
            { id: "AVOID", label: "Avoid" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold transition-colors ${
                filter === f.id
                  ? "bg-text-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.map((stock) => {
          const positive = stock.changePercent >= 0;
          const style = SIGNAL_STYLES[stock.signal] ?? SIGNAL_STYLES.HOLD;
          const range = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
          const posInRange = range > 0 ? ((stock.price - stock.fiftyTwoWeekLow) / range) * 100 : 50;

          return (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className="block rounded-2xl bg-bg-surface p-4 transition-all hover:shadow-md active:scale-[0.98]"
            >
              {/* Row 1: Ticker + Signal + Price */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{stock.symbol}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>
                      {stock.signal}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">${stock.price.toFixed(2)}</div>
                  <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                    {positive ? "+" : ""}{stock.changePercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-2">
                <ScoreBar score={stock.score} />
              </div>

              {/* Key metrics */}
              <div className="mt-2 flex items-center gap-3 text-[10px] text-text-secondary">
                <span>RSI <strong className={`${stock.rsi < 30 ? "text-bearish" : stock.rsi > 70 ? "text-bullish" : "text-text-primary"}`}>{stock.rsi}</strong></span>
                <span>50 SMA <strong className="text-text-primary">${stock.sma50.toFixed(0)}</strong></span>
                <span>150 SMA <strong className="text-text-primary">${stock.sma150.toFixed(0)}</strong></span>
                <ArrowRight size={10} className="ml-auto text-text-secondary" />
              </div>

              {/* Reason */}
              <div className="mt-1.5 text-[11px] text-text-secondary">
                {stock.reason}
              </div>

              {/* 52W range mini bar */}
              <div className="mt-2 relative h-1 rounded-full bg-border">
                <div
                  className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info"
                  style={{ left: `${Math.min(Math.max(posInRange, 3), 97)}%` }}
                />
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-bg-surface p-8 text-center text-sm text-text-secondary">
            No stocks match this filter
          </div>
        )}
      </div>
    </div>
  );
}
