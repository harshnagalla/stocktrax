"use client";

import { useEffect, useState } from "react";
import type { TickerAnalysis } from "@/app/page";
import Link from "next/link";
import StockHeader from "./StockHeader";
import { Loader2, ArrowRight, Shield } from "lucide-react";

interface Verdict {
  action: string;
  confidence: number;
  oneLiner: string;
  bullPoint: string;
  bearPoint: string;
  moat: string;
  risk: string;
  intrinsicValue: number | null;
  buyAt: number | null;
  technicalScore: number;
  fundamentalScore: number;
}

interface AnalysisDashboardProps {
  tickerData: TickerAnalysis[];
}

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  AVOID: { bg: "bg-bearish/15", text: "text-bearish" },
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="w-5 text-right text-[10px] font-bold">{score}</span>
    </div>
  );
}

export default function AnalysisDashboard({ tickerData }: AnalysisDashboardProps) {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    tickerData.forEach((td) => {
      const sym = td.quote.symbol;
      if (verdicts[sym] || loading.has(sym)) return;

      setLoading((prev) => new Set(prev).add(sym));
      fetch(`/api/verdict?symbol=${sym}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data && !data.error) setVerdicts((prev) => ({ ...prev, [sym]: data })); })
        .catch(() => {})
        .finally(() => { setLoading((prev) => { const n = new Set(prev); n.delete(sym); return n; }); });
    });
  }, [tickerData, verdicts, loading]);

  return (
    <div className="space-y-4">
      {tickerData.map((data) => {
        const sym = data.quote.symbol;
        const v = verdicts[sym];
        const isLoading = loading.has(sym);
        const action = v?.action ?? "HOLD";
        const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

        return (
          <Link key={sym} href={`/stock/${sym}`} className="block space-y-3">
            <StockHeader data={data} />

            <div className="rounded-2xl bg-bg-surface p-4 transition-all hover:shadow-md">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Loader2 size={12} className="animate-spin" />
                  Debating bull vs bear...
                </div>
              ) : v ? (
                <>
                  {/* Action + one-liner */}
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}>{action}</span>
                    <span className="text-xs text-text-secondary">{v.confidence}/10 confidence</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium">{v.oneLiner}</p>

                  {/* Score bars */}
                  <div className="mt-3 space-y-1">
                    <ScoreBar label="Technical" score={v.technicalScore} color="bg-info" />
                    <ScoreBar label="Fundamental" score={v.fundamentalScore} color="bg-bullish" />
                  </div>

                  {/* Key numbers */}
                  <div className="mt-2 flex items-center gap-3 text-[10px]">
                    {v.intrinsicValue && <span className="text-bullish font-bold">IV ${v.intrinsicValue}</span>}
                    {v.buyAt && <span className="text-info font-bold">Buy at ${v.buyAt}</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <Shield size={10} className="text-bullish" />
                      <span className="font-bold">{v.moat}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end text-[9px] text-info">
                    Full analysis <ArrowRight size={8} className="ml-0.5" />
                  </div>
                </>
              ) : (
                <div className="text-xs text-text-secondary">Analysis unavailable</div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
