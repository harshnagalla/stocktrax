"use client";

import { useEffect, useState } from "react";
import { HOLDINGS, type Holding } from "./holdings";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown, Shield, ArrowRightLeft } from "lucide-react";
import ETFRebalancer from "./ETFRebalancer";

interface QuoteData {
  price: number;
  changePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  sma50: number;
  sma150: number;
  rsi: number;
  signal: string;
  buyAt: number | null;
  name: string;
}

interface AiData {
  action: string;
  technicalScore: number;
  fundamentalScore: number;
  moatScore: number;
  targetUpside: number;
  intrinsicValue: number | null;
  buyAtPrice: number | null;
  analysis: string;
}

interface EnrichedHolding extends Holding {
  quote: QuoteData | null;
  ai: AiData | null;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[11px] text-text-secondary">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="w-6 text-right text-[11px] font-bold">{score}</span>
    </div>
  );
}

function MoatDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-1.5 w-3 rounded-full ${i <= score ? "bg-bullish" : "bg-border"}`} />
      ))}
    </div>
  );
}

export default function PortfolioDashboard() {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [aiData, setAiData] = useState<Record<string, AiData>>({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [showRebalancer, setShowRebalancer] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then(setQuotes)
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/portfolio-analysis")
      .then((r) => r.ok ? r.json() : {})
      .then(setAiData)
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

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
    const ai = (aiData[h.ticker] as AiData) ?? null;
    const currentPrice = quote?.price ?? null;
    const marketValue = currentPrice ? currentPrice * h.shares : h.avgCost * h.shares;
    const costBasis = h.avgCost * h.shares;
    return { ...h, quote, ai, marketValue, pnl: marketValue - costBasis, pnlPct: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0 };
  });

  const tiger = enriched.filter((h) => h.account === "Tiger");
  const ibkr = enriched.filter((h) => h.account === "IBKR");

  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = enriched.reduce((s, h) => s + h.avgCost * h.shares, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalPositive = totalPnl >= 0;

  const actionCounts: Record<string, number> = {};
  enriched.forEach((h) => {
    const a = h.ai?.action ?? "HOLD";
    actionCounts[a] = (actionCounts[a] ?? 0) + 1;
  });

  function renderCard(h: EnrichedHolding) {
    const key = `${h.account}-${h.ticker}`;
    const positive = h.pnl >= 0;
    const action = h.ai?.action ?? "HOLD";
    const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

    return (
      <Link key={key} href={`/stock/${h.ticker}`} className="block rounded-2xl bg-bg-surface p-4 transition-all hover:shadow-md active:scale-[0.98]">
        {/* Row 1: Ticker + Action badge + Price */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{h.ticker}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>
                {action}
              </span>
            </div>
            <div className="text-[11px] text-text-secondary">{h.quote?.name ?? ""}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">${h.quote?.price?.toFixed(2) ?? "--"}</div>
            <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
              {h.quote?.changePercent != null ? `${h.quote.changePercent >= 0 ? "+" : ""}${h.quote.changePercent.toFixed(2)}%` : ""}
            </div>
          </div>
        </div>

        {/* Row 2: Key metrics */}
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <span className="text-text-secondary">
            P&L <strong className={positive ? "text-bullish" : "text-bearish"}>
              {positive ? "+" : ""}{h.pnlPct.toFixed(1)}%
            </strong>
          </span>
          <span className="text-text-secondary">
            {h.shares} shares @ ${h.avgCost.toFixed(2)}
          </span>
        </div>

        {h.ai ? (
          <>
            {/* Row 3: Score bars */}
            <div className="mt-3 space-y-1.5">
              <ScoreBar label="Technical" score={h.ai.technicalScore} color="bg-info" />
              <ScoreBar label="Fundamental" score={h.ai.fundamentalScore} color="bg-bullish" />
            </div>

            {/* Row 4: Target + RSI + Moat */}
            <div className="mt-3 flex items-center gap-3 text-[11px]">
              {h.ai.targetUpside > 0 && (
                <span className="font-bold text-bullish">+{h.ai.targetUpside}% target</span>
              )}
              {h.quote?.rsi && (
                <span className="text-text-secondary">RSI {h.quote.rsi}</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Shield size={10} className="text-bullish" />
                <MoatDots score={h.ai.moatScore} />
              </div>
            </div>

            {/* Row 5: Buy signal */}
            {h.ai.buyAtPrice && h.quote && (
              <div className="mt-2 rounded-lg bg-bullish/5 px-3 py-1.5 text-[11px]">
                <span className="font-bold text-bullish">
                  {h.quote.price <= h.ai.buyAtPrice
                    ? "🟢 Buy now — at support level"
                    : h.quote.price <= h.ai.buyAtPrice * 1.05
                      ? "🟡 Almost at buy zone — start small position"
                      : `Wait for $${h.ai.buyAtPrice} to buy`
                  }
                </span>
              </div>
            )}

            {/* Row 6: Analysis one-liner */}
            <div className="mt-2 text-[11px] leading-relaxed text-text-secondary">
              ↗ {h.ai.analysis}
            </div>
          </>
        ) : aiLoading ? (
          <div className="mt-3 flex items-center gap-1 text-[10px] text-text-secondary">
            <Loader2 size={10} className="animate-spin" /> Analyzing with AI...
          </div>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="text-xs font-medium text-text-secondary">Total Portfolio</div>
        <div className="mt-1 text-3xl font-bold">
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${totalPositive ? "text-bullish" : "text-bearish"}`}>
          {totalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {totalPositive ? "+" : ""}${totalPnl.toFixed(2)} ({totalPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%)
        </div>
        <div className="mt-1.5 flex gap-4 text-[11px] text-text-secondary">
          <span>Invested: ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`font-bold ${totalPositive ? "text-bullish" : "text-bearish"}`}>
            {totalPositive ? "+" : ""}{totalPnlPct.toFixed(2)}% overall return
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
            {Object.entries(actionCounts).map(([action, count]) => {
              const s = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;
              return <span key={action} className={`rounded-full px-2.5 py-1 ${s.bg} ${s.text}`}>{count} {action}</span>;
            })}
            {aiLoading && (
              <span className="flex items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1 text-text-secondary">
                <Loader2 size={10} className="animate-spin" /> Analyzing...
              </span>
            )}
          </div>
          <button
            onClick={() => setShowRebalancer((v) => !v)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors ${
              showRebalancer
                ? "bg-info/15 text-info"
                : "bg-bg-surface text-text-secondary hover:text-info"
            }`}
          >
            <ArrowRightLeft size={12} />
            ETF Rebalance
          </button>
        </div>
      </div>

      {showRebalancer && (
        <ETFRebalancer quotes={quotes as Record<string, { price: number; name?: string }>} />
      )}

      {[{ name: "Tiger Brokers", holdings: tiger }, { name: "IBKR", holdings: ibkr }].map((account) => (
        <div key={account.name}>
          <div className="mb-2 px-1 text-sm font-semibold">{account.name}</div>
          <div className="space-y-2">
            {account.holdings.map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
}
