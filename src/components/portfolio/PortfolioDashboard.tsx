"use client";

import { useEffect, useState, useCallback } from "react";
import { HOLDINGS, type Holding } from "./holdings";
import { Loader2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
  signal: "BUY MORE" | "HOLD" | "SELL" | "WATCH";
  reason: string;
  buyAt: number | null;
  name: string;
}

interface EnrichedHolding extends Holding {
  quote: QuoteData | null;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

interface AiAnalysis {
  action: string;
  confidence: string;
  moat: string;
  dropReason: string;
  dropExplanation: string;
  intrinsicValue: number | null;
  buyAtPrice: number | null;
  summary: string;
}

const SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  "BUY MORE": { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
};

export default function PortfolioDashboard() {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AiAnalysis>>({});
  const [aiLoading, setAiLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/portfolio")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setQuotes(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const fetchAiAnalysis = useCallback(async (ticker: string) => {
    if (aiAnalysis[ticker] || aiLoading.has(ticker)) return;
    setAiLoading((prev) => new Set(prev).add(ticker));
    try {
      const res = await fetch(`/api/analysis?symbol=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis((prev) => ({ ...prev, [ticker]: data }));
      }
    } catch { /* skip */ }
    finally {
      setAiLoading((prev) => { const next = new Set(prev); next.delete(ticker); return next; });
    }
  }, [aiAnalysis, aiLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading portfolio...</span>
      </div>
    );
  }

  const enriched: EnrichedHolding[] = HOLDINGS.map((h) => {
    const quote = (quotes[h.ticker] as QuoteData) ?? null;
    const currentPrice = quote?.price ?? null;
    const marketValue = currentPrice ? currentPrice * h.shares : h.avgCost * h.shares;
    const costBasis = h.avgCost * h.shares;
    const pnl = marketValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { ...h, quote, marketValue, pnl, pnlPct };
  });

  const tiger = enriched.filter((h) => h.account === "Tiger");
  const ibkr = enriched.filter((h) => h.account === "IBKR");

  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = enriched.reduce((s, h) => s + h.avgCost * h.shares, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalPositive = totalPnl >= 0;

  // Count signals
  const signalCounts = enriched.reduce(
    (acc, h) => {
      const sig = h.quote?.signal ?? "HOLD";
      acc[sig] = (acc[sig] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function renderHolding(h: EnrichedHolding) {
    const key = `${h.account}-${h.ticker}`;
    const isExpanded = expanded.has(key);
    const positive = h.pnl >= 0;
    const signal = h.quote?.signal ?? "HOLD";
    const style = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.HOLD;

    return (
      <div key={key} className="rounded-xl overflow-hidden">
        <button
          onClick={() => toggleExpand(key)}
          className="flex w-full items-center justify-between px-3 py-3 text-left transition-colors hover:bg-white active:bg-white"
        >
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{h.ticker}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${style.bg} ${style.text}`}>
                  {signal}
                </span>
              </div>
              <div className="text-[10px] text-text-secondary">
                {h.shares} shares @ ${h.avgCost.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-semibold">
                ${h.quote?.price?.toFixed(2) ?? "--"}
              </div>
              <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                {positive ? "+" : ""}{h.pnlPct.toFixed(1)}%
              </div>
            </div>
            {isExpanded ? <ChevronUp size={14} className="text-text-secondary" /> : <ChevronDown size={14} className="text-text-secondary" />}
          </div>
        </button>

        {isExpanded && h.quote && (
          <div className="border-t border-border px-3 py-3 space-y-2">
            {/* Signal explanation */}
            <div className={`rounded-lg p-3 text-xs leading-relaxed ${style.bg}`}>
              <span className={`font-bold ${style.text}`}>{signal}</span>
              <span className="text-text-primary ml-1">{h.quote.reason}</span>
            </div>

            {/* Buy at price */}
            {h.quote.buyAt && (
              <div className="rounded-lg bg-bullish/5 p-3 text-xs">
                <span className="font-bold text-bullish">Buy at: </span>
                <span className="text-text-primary">${h.quote.buyAt}</span>
                <span className="text-text-secondary ml-1">
                  ({((h.quote.buyAt - h.quote.price) / h.quote.price * 100).toFixed(1)}% from current)
                </span>
              </div>
            )}

            {/* Key levels */}
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-lg bg-bg-surface p-2 text-center">
                <div className="text-text-secondary">50 SMA</div>
                <div className="font-bold">${h.quote.sma50.toFixed(0)}</div>
              </div>
              <div className="rounded-lg bg-bg-surface p-2 text-center">
                <div className="text-text-secondary">150 SMA</div>
                <div className="font-bold">${h.quote.sma150.toFixed(0)}</div>
              </div>
              <div className="rounded-lg bg-bg-surface p-2 text-center">
                <div className="text-text-secondary">RSI</div>
                <div className={`font-bold ${h.quote.rsi < 30 ? "text-bearish" : h.quote.rsi > 70 ? "text-bullish" : ""}`}>
                  {h.quote.rsi}
                </div>
              </div>
            </div>

            {/* 52-week range */}
            <div className="text-[10px]">
              <div className="flex justify-between text-text-secondary">
                <span>${h.quote.fiftyTwoWeekLow.toFixed(0)}</span>
                <span>52W Range</span>
                <span>${h.quote.fiftyTwoWeekHigh.toFixed(0)}</span>
              </div>
              <div className="relative mt-1 h-1.5 rounded-full bg-border">
                {(() => {
                  const range = h.quote.fiftyTwoWeekHigh - h.quote.fiftyTwoWeekLow;
                  const pos = range > 0 ? ((h.quote.price - h.quote.fiftyTwoWeekLow) / range) * 100 : 50;
                  return (
                    <div
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info ring-2 ring-white"
                      style={{ left: `${Math.min(Math.max(pos, 3), 97)}%` }}
                    />
                  );
                })()}
              </div>
            </div>

            {/* P&L detail */}
            <div className="flex justify-between text-[10px] text-text-secondary">
              <span>Cost: ${(h.avgCost * h.shares).toFixed(0)}</span>
              <span>Value: ${h.marketValue.toFixed(0)}</span>
              <span className={positive ? "text-bullish" : "text-bearish"}>
                P&L: {positive ? "+" : ""}${h.pnl.toFixed(0)}
              </span>
            </div>

            {/* AI Deep Analysis */}
            {aiAnalysis[h.ticker] ? (
              <div className="rounded-lg bg-info/5 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-info">
                  <Sparkles size={12} />
                  Adam Khoo Analysis
                </div>
                <p className="leading-relaxed">{aiAnalysis[h.ticker].summary}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-text-secondary">Moat: </span>
                    <span>{aiAnalysis[h.ticker].moat}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Drop type: </span>
                    <span className={aiAnalysis[h.ticker].dropReason === "SENTIMENT" ? "text-bullish" : aiAnalysis[h.ticker].dropReason === "STRUCTURAL" ? "text-bearish" : ""}>
                      {aiAnalysis[h.ticker].dropReason}
                    </span>
                  </div>
                  {aiAnalysis[h.ticker].intrinsicValue && (
                    <div>
                      <span className="text-text-secondary">Intrinsic value: </span>
                      <span className="font-bold">${aiAnalysis[h.ticker].intrinsicValue}</span>
                    </div>
                  )}
                  {aiAnalysis[h.ticker].buyAtPrice && (
                    <div>
                      <span className="text-text-secondary">Buy at: </span>
                      <span className="font-bold text-bullish">${aiAnalysis[h.ticker].buyAtPrice}</span>
                    </div>
                  )}
                </div>
                {aiAnalysis[h.ticker].dropExplanation && (
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    {aiAnalysis[h.ticker].dropExplanation}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => fetchAiAnalysis(h.ticker)}
                disabled={aiLoading.has(h.ticker)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-info/10 py-2 text-xs font-medium text-info transition-colors hover:bg-info/20 disabled:opacity-50"
              >
                {aiLoading.has(h.ticker) ? (
                  <><Loader2 size={12} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles size={12} /> Deep Analysis</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Portfolio Summary */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="text-xs font-medium text-text-secondary">Total Portfolio</div>
        <div className="mt-1 text-3xl font-bold">
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${totalPositive ? "text-bullish" : "text-bearish"}`}>
          {totalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {totalPositive ? "+" : ""}${totalPnl.toFixed(2)} ({totalPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%)
        </div>

        {/* Signal summary bar */}
        <div className="mt-3 flex gap-2 text-[10px] font-bold">
          {signalCounts["BUY MORE"] && (
            <span className="rounded-full bg-bullish/15 px-2 py-0.5 text-bullish">
              {signalCounts["BUY MORE"]} BUY MORE
            </span>
          )}
          {signalCounts.HOLD && (
            <span className="rounded-full bg-info/10 px-2 py-0.5 text-info">
              {signalCounts.HOLD} HOLD
            </span>
          )}
          {signalCounts.WATCH && (
            <span className="rounded-full bg-neutral/15 px-2 py-0.5 text-neutral">
              {signalCounts.WATCH} WATCH
            </span>
          )}
          {signalCounts.SELL && (
            <span className="rounded-full bg-bearish/15 px-2 py-0.5 text-bearish">
              {signalCounts.SELL} SELL
            </span>
          )}
        </div>
      </div>

      {/* Holdings by Account */}
      {[{ name: "Tiger Brokers", holdings: tiger }, { name: "IBKR", holdings: ibkr }].map((account) => (
        <div key={account.name} className="rounded-2xl bg-bg-surface p-5">
          <div className="mb-2 text-sm font-semibold">{account.name}</div>
          <div className="space-y-1">
            {account.holdings.map(renderHolding)}
          </div>
        </div>
      ))}
    </div>
  );
}
