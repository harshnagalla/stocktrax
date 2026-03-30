"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Shield, ChevronDown, ChevronUp } from "lucide-react";

interface StockData {
  name: string;
  price: number;
  changePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
}

interface Verdict {
  action: string;
  confidence: number;
  oneLiner: string;
  verdict: string;
  bullPoint: string;
  bearPoint: string;
  moat: string;
  moatWhy: string;
  risk: string;
  topRisk: string;
  intrinsicValue: number | null;
  buyAt: number | null;
  stopLoss: number | null;
  technicalScore: number;
  fundamentalScore: number;
}

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  BUY: { bg: "bg-bullish/10", text: "text-bullish", border: "border-bullish/20" },
  HOLD: { bg: "bg-info/10", text: "text-info", border: "border-info/20" },
  SELL: { bg: "bg-bearish/10", text: "text-bearish", border: "border-bearish/20" },
  AVOID: { bg: "bg-bearish/10", text: "text-bearish", border: "border-bearish/20" },
};

const RISK_COLORS: Record<string, string> = { HIGH: "text-bearish", MEDIUM: "text-neutral", LOW: "text-bullish" };

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs text-text-secondary">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="w-7 text-right text-xs font-bold">{score}</span>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();

  const [data, setData] = useState<StockData | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [verdictLoading, setVerdictLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    fetch(`/api/quotes?symbols=${symbol}&analyze=true`)
      .then((r) => r.json())
      .then((d) => setData(d[symbol] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/verdict?symbol=${symbol}`)
      .then((r) => r.ok ? r.json() : null)
      .then((v) => { if (v && !v.error) setVerdict(v); })
      .catch(() => {})
      .finally(() => setVerdictLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={24} className="animate-spin text-info" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-3">
        <div className="text-sm text-text-secondary">No data for {symbol}</div>
        <button onClick={() => router.back()} className="text-sm text-info hover:underline">Go back</button>
      </div>
    );
  }

  const positive = data.changePercent >= 0;
  const action = verdict?.action ?? "HOLD";
  const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

  const range52 = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
  const pricePos = range52 > 0 ? ((data.price - data.fiftyTwoWeekLow) / range52) * 100 : 50;

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-2xl">
          <button onClick={() => router.back()} className="rounded-full p-1 hover:bg-bg-surface">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{symbol}</span>
              {verdict && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>{action}</span>
              )}
            </div>
            <div className="text-xs text-text-secondary">{data.name}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">${data.price.toFixed(2)}</div>
            <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
              {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {positive ? "+" : ""}{data.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-4 sm:max-w-2xl">

        {/* Verdict Card — the ONE thing the user needs */}
        {verdictLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-8 text-text-secondary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Bull vs Bear debate in progress...</span>
          </div>
        ) : verdict ? (
          <div className={`rounded-2xl border ${style.border} ${style.bg} p-5`}>
            {/* Action + Confidence */}
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${style.text}`}>{action}</span>
              <div className="flex gap-0.5 ml-1">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className={`h-2 w-1.5 rounded-full ${i < verdict.confidence ? "bg-text-primary" : "bg-border"}`} />
                ))}
              </div>
              <span className="text-[10px] text-text-secondary">{verdict.confidence}/10</span>
            </div>

            {/* One liner */}
            <p className="mt-2 text-base font-medium leading-relaxed">{verdict.oneLiner}</p>

            {/* Verdict */}
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{verdict.verdict}</p>

            {/* Score bars */}
            <div className="mt-4 space-y-2">
              <ScoreBar label="Technical" score={verdict.technicalScore} color="bg-info" />
              <ScoreBar label="Fundamental" score={verdict.fundamentalScore} color="bg-bullish" />
            </div>

            {/* Key numbers row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {verdict.intrinsicValue && (
                <div className="rounded-xl bg-white/60 p-3 text-center">
                  <div className="text-[9px] text-text-secondary">Fair Value</div>
                  <div className="text-lg font-bold text-bullish">${verdict.intrinsicValue}</div>
                </div>
              )}
              {verdict.buyAt && (
                <div className="rounded-xl bg-white/60 p-3 text-center">
                  <div className="text-[9px] text-text-secondary">Buy At</div>
                  <div className="text-lg font-bold text-info">${verdict.buyAt}</div>
                </div>
              )}
              {verdict.stopLoss && (
                <div className="rounded-xl bg-white/60 p-3 text-center">
                  <div className="text-[9px] text-text-secondary">Stop Loss</div>
                  <div className="text-lg font-bold text-bearish">${verdict.stopLoss}</div>
                </div>
              )}
            </div>

            {/* Bull vs Bear */}
            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-white/60 p-3">
                <div className="text-[9px] font-bold text-bullish">BULL</div>
                <p className="mt-0.5 text-xs leading-relaxed">{verdict.bullPoint}</p>
              </div>
              <div className="rounded-xl bg-white/60 p-3">
                <div className="text-[9px] font-bold text-bearish">BEAR</div>
                <p className="mt-0.5 text-xs leading-relaxed">{verdict.bearPoint}</p>
              </div>
            </div>

            {/* Moat + Risk compact row */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Shield size={12} className="text-bullish" />
                <span className="font-bold">{verdict.moat}</span>
                <span className="text-text-secondary">moat</span>
              </div>
              <div>
                <span className={`font-bold ${RISK_COLORS[verdict.risk] ?? ""}`}>{verdict.risk}</span>
                <span className="text-text-secondary ml-1">risk</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* 52-Week Range — compact */}
        <div className="rounded-2xl bg-bg-surface p-4">
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span>${data.fiftyTwoWeekLow.toFixed(0)}</span>
            <span>52W Range</span>
            <span>${data.fiftyTwoWeekHigh.toFixed(0)}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-border">
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info ring-2 ring-white"
              style={{ left: `${Math.min(Math.max(pricePos, 3), 97)}%` }}
            />
          </div>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between rounded-2xl bg-bg-surface px-5 py-3 text-sm font-medium"
        >
          Technical Details
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="space-y-2">
            {/* Support levels */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-bg-surface p-3 text-center">
                <div className="text-[9px] text-text-secondary">50 SMA</div>
                <div className="text-base font-bold">${data.sma50.toFixed(0)}</div>
                <div className={`text-[9px] font-bold ${data.price > data.sma50 ? "text-bullish" : "text-bearish"}`}>
                  {data.price > data.sma50 ? "Above ↑" : "Below ↓"}
                </div>
              </div>
              <div className="rounded-2xl bg-bg-surface p-3 text-center">
                <div className="text-[9px] text-text-secondary">150 SMA</div>
                <div className="text-base font-bold">${data.sma150.toFixed(0)}</div>
                <div className={`text-[9px] font-bold ${data.price > data.sma150 ? "text-bullish" : "text-bearish"}`}>
                  {data.price > data.sma150 ? "Above ↑" : "Below ↓"}
                </div>
              </div>
              <div className="rounded-2xl bg-bg-surface p-3 text-center">
                <div className="text-[9px] text-text-secondary">RSI</div>
                <div className={`text-base font-bold ${data.rsi < 30 ? "text-bearish" : data.rsi > 70 ? "text-bullish" : ""}`}>
                  {data.rsi}
                </div>
                <div className="text-[9px] text-text-secondary">
                  {data.rsi < 30 ? "Oversold" : data.rsi > 70 ? "Overbought" : "Neutral"}
                </div>
              </div>
            </div>

            {/* Top risk */}
            {verdict?.topRisk && (
              <div className="rounded-2xl bg-bearish/5 p-4">
                <div className="text-[10px] font-bold text-bearish">Top Risk</div>
                <p className="mt-1 text-xs leading-relaxed">{verdict.topRisk}</p>
              </div>
            )}

            {/* Moat explanation */}
            {verdict?.moatWhy && (
              <div className="rounded-2xl bg-bg-surface p-4">
                <div className="text-[10px] font-bold text-text-secondary">Why {verdict.moat} Moat?</div>
                <p className="mt-1 text-xs leading-relaxed">{verdict.moatWhy}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
