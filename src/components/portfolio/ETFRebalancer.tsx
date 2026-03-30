"use client";

import { useEffect, useState, useCallback } from "react";
import { HOLDINGS } from "./holdings";
import {
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
  Layers,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface ETFHoldingItem {
  symbol: string;
  holdingName: string;
  holdingPercent: number;
}

interface ETFData {
  symbol: string;
  name: string;
  holdings: ETFHoldingItem[];
}

interface OverlapPair {
  etf1: string;
  etf2: string;
  sharedHoldings: { symbol: string; name: string; pct1: number; pct2: number }[];
  overlapPercent: number;
}

interface TradeAction {
  ticker: string;
  action: "BUY" | "SELL";
  shares: number;
  dollarAmount: number;
  reason: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const ETF_TICKERS = ["VOO", "QQQ", "VTWO", "XLV", "CWEB", "IBIT"];

// Sensible default target allocations (%)
const DEFAULT_TARGETS: Record<string, number> = {
  VOO: 35,   // S&P 500 core
  QQQ: 25,   // Nasdaq / tech growth
  VTWO: 15,  // Small-cap diversification
  XLV: 10,   // Healthcare sector
  IBIT: 10,  // Bitcoin exposure
  CWEB: 5,   // China internet (speculative)
};

// ── Helpers ────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function fmtDollar(n: number) {
  const abs = Math.abs(n);
  return `${n < 0 ? "-" : ""}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ── Component ──────────────────────────────────────────────────────────

export default function ETFRebalancer({
  quotes,
}: {
  quotes: Record<string, { price: number; name?: string }>;
}) {
  const [etfData, setEtfData] = useState<ETFData[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS);
  const [expandedOverlap, setExpandedOverlap] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/etf-holdings")
      .then((r) => r.json())
      .then((data) => {
        setEtfData(data.etfs ?? []);
        setOverlaps(data.overlaps ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Aggregate ETF holdings across both accounts
  const etfHoldings = ETF_TICKERS.map((ticker) => {
    const rows = HOLDINGS.filter((h) => h.ticker === ticker);
    const totalShares = rows.reduce((s, r) => s + r.shares, 0);
    const totalCost = rows.reduce((s, r) => s + r.shares * r.avgCost, 0);
    const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
    const price = quotes[ticker]?.price ?? avgCost;
    const marketValue = price * totalShares;
    return { ticker, totalShares, avgCost, price, marketValue };
  });

  const totalETFValue = etfHoldings.reduce((s, h) => s + h.marketValue, 0);

  // Compute current allocations
  const currentAlloc: Record<string, number> = {};
  etfHoldings.forEach((h) => {
    currentAlloc[h.ticker] = pct(h.marketValue, totalETFValue);
  });

  // Compute drift and trade recommendations
  const computeTrades = useCallback((): TradeAction[] => {
    const trades: TradeAction[] = [];
    for (const h of etfHoldings) {
      const target = targets[h.ticker] ?? 0;
      const current = currentAlloc[h.ticker] ?? 0;
      const drift = current - target;
      const targetValue = (target / 100) * totalETFValue;
      const diffDollars = h.marketValue - targetValue;

      // Only suggest trade if drift > 2%
      if (Math.abs(drift) < 2) continue;

      const sharesToTrade = Math.abs(Math.round(diffDollars / h.price));
      if (sharesToTrade === 0) continue;

      trades.push({
        ticker: h.ticker,
        action: drift > 0 ? "SELL" : "BUY",
        shares: sharesToTrade,
        dollarAmount: Math.abs(diffDollars),
        reason:
          drift > 0
            ? `Overweight by ${fmtPct(Math.abs(drift))} (${fmtDollar(Math.abs(diffDollars))} above target)`
            : `Underweight by ${fmtPct(Math.abs(drift))} (${fmtDollar(Math.abs(diffDollars))} below target)`,
      });
    }
    return trades.sort((a, b) => b.dollarAmount - a.dollarAmount);
  }, [etfHoldings, targets, currentAlloc, totalETFValue]);

  const trades = computeTrades();

  const handleTargetChange = (ticker: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 100) return;
    setTargets((prev) => ({ ...prev, [ticker]: num }));
  };

  const totalTarget = Object.values(targets).reduce((s, v) => s + v, 0);
  const targetValid = Math.abs(totalTarget - 100) < 0.5;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-8 text-text-secondary">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading ETF data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Current vs Target Allocation ─────────────────────────── */}
      <div className="rounded-2xl bg-bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Target size={15} className="text-info" />
          ETF Allocation &mdash; Current vs Target
        </div>
        <p className="mt-1 text-[11px] text-text-secondary">
          Total ETF value: {fmtDollar(totalETFValue)}. Adjust target %
          to get rebalancing trades.
        </p>

        <div className="mt-3 space-y-2">
          {etfHoldings.map((h) => {
            const current = currentAlloc[h.ticker] ?? 0;
            const target = targets[h.ticker] ?? 0;
            const drift = current - target;
            const driftColor =
              Math.abs(drift) < 2
                ? "text-text-secondary"
                : drift > 0
                  ? "text-bearish"
                  : "text-bullish";

            return (
              <div key={h.ticker} className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold">{h.ticker}</span>

                {/* Allocation bar */}
                <div className="flex-1">
                  <div className="relative h-5 overflow-hidden rounded-full bg-border">
                    {/* Current allocation fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-info/30"
                      style={{ width: `${Math.min(current, 100)}%` }}
                    />
                    {/* Target marker */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-text-primary/60"
                      style={{ left: `${Math.min(target, 100)}%` }}
                    />
                    {/* Current % label */}
                    <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold">
                      {fmtPct(current)}
                    </span>
                  </div>
                </div>

                {/* Target input */}
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={targets[h.ticker] ?? 0}
                    onChange={(e) => handleTargetChange(h.ticker, e.target.value)}
                    className="w-14 rounded-lg border border-border bg-white px-2 py-1 text-center text-xs font-bold focus:border-info focus:outline-none"
                  />
                  <span className="text-[10px] text-text-secondary">%</span>
                </div>

                {/* Drift indicator */}
                <span className={`w-14 text-right text-[10px] font-bold ${driftColor}`}>
                  {Math.abs(drift) < 0.1
                    ? "on target"
                    : `${drift > 0 ? "+" : ""}${fmtPct(drift)}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total target validation */}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className={`font-bold ${targetValid ? "text-bullish" : "text-bearish"}`}>
            Target total: {fmtPct(totalTarget)}
            {!targetValid && " (must equal 100%)"}
          </span>
          <button
            onClick={() => setTargets(DEFAULT_TARGETS)}
            className="text-info hover:underline"
          >
            Reset defaults
          </button>
        </div>
      </div>

      {/* ── Overlap Analysis ─────────────────────────────────────── */}
      {overlaps.length > 0 && (
        <div className="rounded-2xl bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers size={15} className="text-neutral" />
            Holding Overlaps
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            ETFs that share underlying holdings. High overlap means less
            diversification.
          </p>

          <div className="mt-3 space-y-2">
            {overlaps.map((o) => {
              const key = `${o.etf1}-${o.etf2}`;
              const isExpanded = expandedOverlap === key;
              const severity =
                o.overlapPercent > 30
                  ? "bg-bearish/10 border-bearish/20"
                  : o.overlapPercent > 15
                    ? "bg-neutral/10 border-neutral/20"
                    : "bg-bg-surface border-border";

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 ${severity}`}
                >
                  <button
                    onClick={() =>
                      setExpandedOverlap(isExpanded ? null : key)
                    }
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{o.etf1}</span>
                      <ArrowRightLeft size={12} className="text-text-secondary" />
                      <span className="text-xs font-bold">{o.etf2}</span>
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold">
                        {o.sharedHoldings.length} shared
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-bold ${
                          o.overlapPercent > 30
                            ? "text-bearish"
                            : o.overlapPercent > 15
                              ? "text-neutral"
                              : "text-text-secondary"
                        }`}
                      >
                        {fmtPct(o.overlapPercent)} overlap
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      <div className="flex text-[10px] font-bold text-text-secondary">
                        <span className="flex-1">Holding</span>
                        <span className="w-16 text-right">{o.etf1} %</span>
                        <span className="w-16 text-right">{o.etf2} %</span>
                      </div>
                      {o.sharedHoldings.map((sh) => (
                        <div
                          key={sh.symbol}
                          className="flex items-center text-[11px]"
                        >
                          <span className="flex-1 truncate">
                            <span className="font-bold">{sh.symbol}</span>{" "}
                            <span className="text-text-secondary">
                              {sh.name}
                            </span>
                          </span>
                          <span className="w-16 text-right font-mono text-[10px]">
                            {fmtPct(sh.pct1)}
                          </span>
                          <span className="w-16 text-right font-mono text-[10px]">
                            {fmtPct(sh.pct2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overlap warning */}
          {overlaps.some((o) => o.overlapPercent > 30) && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-bearish/5 p-3 text-[11px]">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-bearish"
              />
              <div>
                <span className="font-bold text-bearish">
                  High overlap detected.
                </span>{" "}
                <span className="text-text-secondary">
                  Some ETFs share significant underlying holdings. Consider
                  reducing allocation to overlapping ETFs for better
                  diversification, or consolidating into fewer ETFs.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Rebalancing Trades ───────────────────────────────────── */}
      {targetValid && trades.length > 0 && (
        <div className="rounded-2xl bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRightLeft size={15} className="text-info" />
            Suggested Rebalancing Trades
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            Trades to align your ETF holdings with target allocation.
            Drift threshold: 2%.
          </p>

          <div className="mt-3 space-y-2">
            {trades.map((t) => {
              const isBuy = t.action === "BUY";
              return (
                <div
                  key={t.ticker}
                  className={`flex items-center justify-between rounded-xl border p-3 ${
                    isBuy
                      ? "border-bullish/20 bg-bullish/5"
                      : "border-bearish/20 bg-bearish/5"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isBuy
                            ? "bg-bullish/15 text-bullish"
                            : "bg-bearish/15 text-bearish"
                        }`}
                      >
                        {t.action}
                      </span>
                      <span className="text-sm font-bold">{t.ticker}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {t.reason}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      {t.shares} shares
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      ~{fmtDollar(t.dollarAmount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Net cash flow */}
          {(() => {
            const netBuy = trades
              .filter((t) => t.action === "BUY")
              .reduce((s, t) => s + t.dollarAmount, 0);
            const netSell = trades
              .filter((t) => t.action === "SELL")
              .reduce((s, t) => s + t.dollarAmount, 0);
            const net = netSell - netBuy;
            return (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/60 p-3 text-xs">
                <span className="text-text-secondary">Net cash flow</span>
                <span className={`font-bold ${net >= 0 ? "text-bullish" : "text-bearish"}`}>
                  {net >= 0 ? "+" : ""}{fmtDollar(net)}
                  {net > 0
                    ? " (proceeds from sells)"
                    : net < 0
                      ? " (additional capital needed)"
                      : ""}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {targetValid && trades.length === 0 && (
        <div className="rounded-2xl bg-bullish/5 p-4 text-center text-sm text-bullish font-semibold">
          Your ETF portfolio is balanced within the 2% threshold. No trades needed.
        </div>
      )}

      {!targetValid && (
        <div className="rounded-2xl bg-neutral/5 p-4 text-center text-sm text-neutral font-semibold">
          Adjust target allocations to total 100% to see rebalancing trades.
        </div>
      )}
    </div>
  );
}
