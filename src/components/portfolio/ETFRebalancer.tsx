"use client";

import { useEffect, useState } from "react";
import { HOLDINGS } from "./holdings";
import {
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
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
  totalHoldings: number;
  holdings: ETFHoldingItem[];
}

interface OverlapPair {
  etf1: string;
  etf2: string;
  sharedCount: number;
  sharedHoldings: { symbol: string; name: string; pct1: number; pct2: number }[];
  overlapPercent: number;
}

interface AiRecommendation {
  ticker: string;
  action: "HOLD" | "INCREASE" | "REDUCE" | "SELL";
  targetPct: number;
  reasoning: string;
}

interface AiSwapSuggestion {
  sell: string;
  buyInstead: string;
  reason: string;
}

interface AiRebalanceResult {
  summary: string;
  overlapInsight: string;
  recommendations: AiRecommendation[];
  swapSuggestions: AiSwapSuggestion[];
}

// ── Constants ──────────────────────────────────────────────────────────

const ETF_TICKERS = ["VOO", "QQQ", "VTWO", "XLV", "CWEB", "IBIT"];

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  HOLD: { bg: "bg-info/10", text: "text-info" },
  INCREASE: { bg: "bg-bullish/15", text: "text-bullish" },
  REDUCE: { bg: "bg-neutral/15", text: "text-neutral" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
};

// ── Helpers ────────────────────────────────────────────────────────────

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
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [expandedOverlap, setExpandedOverlap] = useState<string | null>(null);

  // AI state
  const [aiResult, setAiResult] = useState<AiRebalanceResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  useEffect(() => {
    fetch("/api/etf-holdings")
      .then((r) => r.json())
      .then((data) => {
        setEtfData(data.etfs ?? []);
        setOverlaps(data.overlaps ?? []);
        setMatrix(data.matrix ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const requestAiRebalance = () => {
    if (aiLoading || etfData.length === 0) return;
    setAiLoading(true);
    setAiError(null);

    const holdingsPayload = etfHoldings.map((h) => ({
      ticker: h.ticker,
      shares: h.totalShares,
      marketValue: h.marketValue,
      currentPct: totalETFValue > 0 ? (h.marketValue / totalETFValue) * 100 : 0,
    }));

    fetch("/api/etf-rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etfs: etfData,
        overlaps,
        matrix,
        holdings: holdingsPayload,
        totalValue: totalETFValue,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("AI analysis failed");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAiResult(data);
      })
      .catch((e) => setAiError(e.message))
      .finally(() => setAiLoading(false));
  };

  // Get ordered ETF symbols that appear in the matrix
  const matrixETFs = ETF_TICKERS.filter((t) => matrix[t]);

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
      {/* ── Current Allocation ───────────────────────────────────── */}
      <div className="rounded-2xl bg-bg-surface p-4">
        <div className="text-sm font-semibold">ETF Allocation</div>
        <p className="mt-1 text-[11px] text-text-secondary">
          Total ETF value: {fmtDollar(totalETFValue)}
        </p>
        <div className="mt-3 space-y-1.5">
          {etfHoldings.map((h) => {
            const pct = totalETFValue > 0 ? (h.marketValue / totalETFValue) * 100 : 0;
            return (
              <div key={h.ticker} className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold">{h.ticker}</span>
                <div className="flex-1">
                  <div className="relative h-5 overflow-hidden rounded-full bg-border">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-info/30"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold">
                      {fmtPct(pct)}
                    </span>
                  </div>
                </div>
                <span className="w-20 text-right text-[11px] text-text-secondary">
                  {fmtDollar(h.marketValue)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Overlap Matrix Grid ──────────────────────────────────── */}
      {matrixETFs.length > 0 && (
        <div className="rounded-2xl bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers size={15} className="text-neutral" />
            Overlap Matrix
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            Number of shared companies between each ETF pair. Higher = more redundancy.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="p-1 text-left font-bold" />
                  {matrixETFs.map((t) => (
                    <th key={t} className="p-1 text-center font-bold">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixETFs.map((row) => (
                  <tr key={row}>
                    <td className="p-1 font-bold">{row}</td>
                    {matrixETFs.map((col) => {
                      const val = matrix[row]?.[col] ?? 0;
                      const isDiag = row === col;
                      const bg = isDiag
                        ? "bg-border/50"
                        : val > 5
                          ? "bg-bearish/15"
                          : val > 2
                            ? "bg-neutral/10"
                            : val > 0
                              ? "bg-bullish/5"
                              : "";
                      return (
                        <td key={col} className={`p-1 text-center font-mono font-bold ${bg} rounded`}>
                          {isDiag ? (
                            <span className="text-text-secondary">{val}</span>
                          ) : val > 0 ? (
                            <span className={val > 5 ? "text-bearish" : val > 2 ? "text-neutral" : "text-text-secondary"}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-border">0</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex gap-3 text-[10px] text-text-secondary">
            <span><span className="inline-block h-2 w-4 rounded bg-bearish/15" /> 6+ shared</span>
            <span><span className="inline-block h-2 w-4 rounded bg-neutral/10" /> 3-5 shared</span>
            <span><span className="inline-block h-2 w-4 rounded bg-bullish/5" /> 1-2 shared</span>
          </div>
        </div>
      )}

      {/* ── Detailed Overlaps (expandable) ───────────────────────── */}
      {overlaps.length > 0 && (
        <div className="rounded-2xl bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRightLeft size={15} className="text-neutral" />
            Overlap Details
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            Tap a pair to see which companies are held in both ETFs.
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
                <div key={key} className={`rounded-xl border p-3 ${severity}`}>
                  <button
                    onClick={() => setExpandedOverlap(isExpanded ? null : key)}
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{o.etf1}</span>
                      <ArrowRightLeft size={12} className="text-text-secondary" />
                      <span className="text-xs font-bold">{o.etf2}</span>
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold">
                        {o.sharedCount} companies
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
                        {fmtPct(o.overlapPercent)} weight
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      <div className="flex text-[10px] font-bold text-text-secondary">
                        <span className="flex-1">Company</span>
                        <span className="w-16 text-right">{o.etf1} %</span>
                        <span className="w-16 text-right">{o.etf2} %</span>
                      </div>
                      {o.sharedHoldings.map((sh) => (
                        <div key={sh.symbol} className="flex items-center text-[11px]">
                          <span className="flex-1 truncate">
                            <span className="font-bold">{sh.symbol}</span>{" "}
                            <span className="text-text-secondary">{sh.name}</span>
                          </span>
                          <span className="w-16 text-right font-mono text-[10px]">{fmtPct(sh.pct1)}</span>
                          <span className="w-16 text-right font-mono text-[10px]">{fmtPct(sh.pct2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {overlaps.some((o) => o.overlapPercent > 30) && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-bearish/5 p-3 text-[11px]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-bearish" />
              <div>
                <span className="font-bold text-bearish">High overlap detected.</span>{" "}
                <span className="text-text-secondary">
                  Some ETFs share significant holdings. Use AI analysis below for specific recommendations.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Rebalancing ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-bg-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={15} className="text-info" />
            AI Rebalancing Advice
          </div>
          <button
            onClick={requestAiRebalance}
            disabled={aiLoading}
            className="flex items-center gap-1 rounded-full bg-info/10 px-3 py-1.5 text-[11px] font-bold text-info transition-colors hover:bg-info/20 disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Analyzing...
              </>
            ) : aiResult ? (
              <>
                <RefreshCw size={12} />
                Refresh
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Analyze with AI
              </>
            )}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-text-secondary">
          AI analyzes overlap between your ETFs and recommends which to sell, reduce, or increase for better diversification.
        </p>

        {aiError && (
          <div className="mt-3 rounded-lg bg-bearish/5 p-3 text-[11px] text-bearish">
            {aiError}
          </div>
        )}

        {aiResult && (
          <div className="mt-3 space-y-3">
            {/* Summary */}
            <div className="rounded-lg bg-info/5 p-3 text-[12px] leading-relaxed">
              {aiResult.summary}
            </div>

            {/* Overlap Insight */}
            <div className="rounded-lg bg-neutral/5 p-3">
              <div className="text-[11px] font-bold text-neutral">Overlap Insight</div>
              <div className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                {aiResult.overlapInsight}
              </div>
            </div>

            {/* Per-ETF Recommendations */}
            <div className="space-y-2">
              <div className="text-xs font-bold">Recommendations per ETF</div>
              {aiResult.recommendations.map((rec) => {
                const colors = ACTION_COLORS[rec.action] ?? ACTION_COLORS.HOLD;
                const currentHolding = etfHoldings.find((h) => h.ticker === rec.ticker);
                const currentPct = currentHolding && totalETFValue > 0
                  ? (currentHolding.marketValue / totalETFValue) * 100
                  : 0;

                return (
                  <div
                    key={rec.ticker}
                    className={`rounded-xl border p-3 ${
                      rec.action === "SELL"
                        ? "border-bearish/20 bg-bearish/5"
                        : rec.action === "REDUCE"
                          ? "border-neutral/20 bg-neutral/5"
                          : rec.action === "INCREASE"
                            ? "border-bullish/20 bg-bullish/5"
                            : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                          {rec.action}
                        </span>
                        <span className="text-sm font-bold">{rec.ticker}</span>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="text-text-secondary">{fmtPct(currentPct)}</span>
                        <span className="text-text-secondary mx-1">&rarr;</span>
                        <span className="font-bold">{fmtPct(rec.targetPct)}</span>
                      </div>
                    </div>
                    <div className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                      {rec.reasoning}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Swap Suggestions */}
            {aiResult.swapSuggestions && aiResult.swapSuggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold">Swap Ideas</div>
                {aiResult.swapSuggestions.map((swap, i) => (
                  <div key={i} className="rounded-xl border border-info/20 bg-info/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-bearish">{swap.sell}</span>
                      <ArrowRightLeft size={12} className="text-text-secondary" />
                      <span className="text-bullish">{swap.buyInstead}</span>
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                      {swap.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!aiResult && !aiLoading && !aiError && (
          <div className="mt-3 rounded-lg bg-bg-surface p-4 text-center text-[11px] text-text-secondary">
            Click &ldquo;Analyze with AI&rdquo; to get personalized rebalancing recommendations based on your ETF overlap data.
          </div>
        )}
      </div>
    </div>
  );
}
