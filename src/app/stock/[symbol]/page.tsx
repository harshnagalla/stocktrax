"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Shield, ChevronDown, ChevronUp, Info } from "lucide-react";

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
  signal: string;
  reason: string;
  buyAt: number | null;
}

interface AiAnalysis {
  action: string;
  confidence: string;
  summary: string;
  moatType: string;
  moatReason: string;
  moatScore: number;
  dropReason: string;
  dropExplanation: string;
  intrinsicValue: number | null;
  buyAtPrice: number | null;
  shortTermSupport: number | null;
  longTermSupport: number | null;
  technicalScore: number;
  fundamentalScore: number;
  targetUpside: number;
}

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  BUY: { bg: "bg-bullish/10", text: "text-bullish", border: "border-bullish/20" },
  HOLD: { bg: "bg-info/10", text: "text-info", border: "border-info/20" },
  SELL: { bg: "bg-bearish/10", text: "text-bearish", border: "border-bearish/20" },
  WATCH: { bg: "bg-neutral/10", text: "text-neutral", border: "border-neutral/20" },
};

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

function MoatDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-2 w-4 rounded-full ${i <= score ? "bg-bullish" : "bg-border"}`} />
      ))}
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase();

  const [data, setData] = useState<StockData | null>(null);
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    fetch(`/api/quotes?symbols=${symbol}&analyze=true`)
      .then((r) => r.json())
      .then((d) => setData(d[symbol] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/analysis?symbol=${symbol}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && !d.error) setAi(d); })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [symbol]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white"><Loader2 size={24} className="animate-spin text-info" /></div>;
  }
  if (!data) {
    return <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-3"><div className="text-sm text-text-secondary">No data for {symbol}</div><button onClick={() => router.back()} className="text-sm text-info hover:underline">Go back</button></div>;
  }

  const positive = data.changePercent >= 0;
  // Use TECHNICAL signal from our SMA calculation, not AI hallucination
  const action = data.signal ?? "HOLD";
  const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

  const range52 = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
  const pricePos = range52 > 0 ? ((data.price - data.fiftyTwoWeekLow) / range52) * 100 : 50;

  // Entry point = nearest SMA support BELOW current price (from actual data, not AI)
  const supports = [data.sma50, data.sma150, data.sma200].filter((s) => s > 0 && s < data.price).sort((a, b) => b - a);
  const entryPoint = supports[0] ?? data.buyAt;
  const stopLoss = entryPoint ? Math.round(entryPoint * 0.92) : null;

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-2xl">
          <button onClick={() => router.back()} className="rounded-full p-1 hover:bg-bg-surface"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{symbol}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>{action}</span>
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

        {/* Signal Card — based on REAL SMA data */}
        <div className={`rounded-2xl border ${style.border} ${style.bg} p-5`}>
          <div className={`text-2xl font-bold ${style.text}`}>{action}</div>
          <p className="mt-1 text-sm leading-relaxed">{data.reason}</p>

          {/* Key numbers from REAL data */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {entryPoint && (
              <div className="rounded-xl bg-white/60 p-3 text-center">
                <div className="text-[9px] text-text-secondary">Entry Point</div>
                <div className="text-lg font-bold text-info">${Math.round(entryPoint)}</div>
                <div className="text-[9px] text-text-secondary">
                  {Math.round(entryPoint) === Math.round(data.sma50) ? "50 SMA" : Math.round(entryPoint) === Math.round(data.sma150) ? "150 SMA" : "Support"}
                </div>
              </div>
            )}
            {stopLoss && (
              <div className="rounded-xl bg-white/60 p-3 text-center">
                <div className="text-[9px] text-text-secondary">Stop Loss</div>
                <div className="text-lg font-bold text-bearish">${stopLoss}</div>
                <div className="text-[9px] text-text-secondary">-8% from entry</div>
              </div>
            )}
            <div className="rounded-xl bg-white/60 p-3 text-center">
              <div className="text-[9px] text-text-secondary">RSI</div>
              <div className={`text-lg font-bold ${data.rsi < 30 ? "text-bearish" : data.rsi > 70 ? "text-bullish" : ""}`}>{data.rsi}</div>
              <div className="text-[9px] text-text-secondary">{data.rsi < 30 ? "Oversold" : data.rsi > 70 ? "Overbought" : "Neutral"}</div>
            </div>
          </div>
        </div>

        {/* AI Analysis — qualitative (moat, drop type) */}
        {aiLoading ? (
          <div className="flex items-center gap-2 rounded-2xl bg-bg-surface p-5 text-xs text-text-secondary">
            <Loader2 size={12} className="animate-spin" /> Analyzing...
          </div>
        ) : ai ? (
          <div className="rounded-2xl bg-bg-surface p-5 space-y-3">
            <div className="space-y-1.5">
              <ScoreBar label="Technical" score={ai.technicalScore} color="bg-info" />
              <ScoreBar label="Fundamental" score={ai.fundamentalScore} color="bg-bullish" />
            </div>

            <p className="text-sm leading-relaxed">{ai.summary}</p>

            {/* Moat */}
            <div className="rounded-xl bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-text-secondary">Moat</div>
                <div className="flex items-center gap-1.5">
                  <Shield size={10} className="text-bullish" />
                  <MoatDots score={ai.moatScore} />
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed">{ai.moatReason}</p>
            </div>

            {/* Drop type */}
            {ai.dropReason !== "NONE" && (
              <div className="rounded-xl bg-white p-3">
                <div className="text-[10px] text-text-secondary">Why did it drop?</div>
                <div className={`mt-0.5 text-sm font-bold ${ai.dropReason === "SENTIMENT" ? "text-bullish" : "text-bearish"}`}>
                  {ai.dropReason} {ai.dropReason === "SENTIMENT" ? "— buying opportunity" : "— be cautious"}
                </div>
                <p className="mt-1 text-xs text-text-secondary">{ai.dropExplanation}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* 52W Range */}
        <div className="rounded-2xl bg-bg-surface p-4">
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span>${data.fiftyTwoWeekLow.toFixed(0)}</span>
            <span>52W Range</span>
            <span>${data.fiftyTwoWeekHigh.toFixed(0)}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-border">
            <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info ring-2 ring-white" style={{ left: `${Math.min(Math.max(pricePos, 3), 97)}%` }} />
          </div>
        </div>

        {/* Technical Details — expandable */}
        <button onClick={() => setShowDetails(!showDetails)} className="flex w-full items-center justify-between rounded-2xl bg-bg-surface px-5 py-3 text-sm font-medium">
          Technical Details
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetails && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "50 SMA", value: data.sma50, above: data.price > data.sma50 },
                { label: "150 SMA", value: data.sma150, above: data.price > data.sma150 },
                { label: "200 SMA", value: data.sma200, above: data.price > data.sma200 },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-bg-surface p-3 text-center">
                  <div className="text-[9px] text-text-secondary">{s.label}</div>
                  <div className="text-base font-bold">${s.value.toFixed(0)}</div>
                  <div className={`text-[9px] font-bold ${s.above ? "text-bullish" : "text-bearish"}`}>{s.above ? "Above ↑" : "Below ↓"}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-bg-surface p-4">
              <div className="text-[10px] font-medium text-text-secondary mb-1">What this means</div>
              <div className="flex gap-1.5 text-xs text-text-secondary leading-relaxed">
                <Info size={12} className="mt-0.5 shrink-0 text-info" />
                <span>
                  {data.price > data.sma50 && data.sma50 > data.sma150
                    ? "All moving averages lined up bullishly. Ideal for buying."
                    : data.price < data.sma200
                      ? "Price below 200 SMA — long-term trend broken. Wait."
                      : "Trend is transitioning. Wait for clarity before buying."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
