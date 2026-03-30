"use client";

import { useEffect, useState } from "react";
import type { TickerAnalysis } from "@/app/page";
import Link from "next/link";
import StockHeader from "./StockHeader";
import { Loader2, Sparkles, Shield, ArrowRight } from "lucide-react";

interface AiData {
  action: string;
  summary: string;
  moatType: string;
  moatReason: string;
  moatScore: number;
  intrinsicValue: number | null;
  buyAtPrice: number | null;
  dropReason: string;
  dropExplanation: string;
  technicalScore: number;
  fundamentalScore: number;
  targetUpside: number;
}

interface AnalysisDashboardProps {
  tickerData: TickerAnalysis[];
}

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[10px] text-text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="w-5 text-right text-[10px] font-bold">{score}</span>
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

export default function AnalysisDashboard({ tickerData }: AnalysisDashboardProps) {
  const [aiMap, setAiMap] = useState<Record<string, AiData>>({});
  const [loadingAi, setLoadingAi] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-fetch AI analysis for each ticker
    tickerData.forEach((td) => {
      const sym = td.quote.symbol;
      if (aiMap[sym] || loadingAi.has(sym)) return;

      setLoadingAi((prev) => new Set(prev).add(sym));
      fetch(`/api/analysis?symbol=${sym}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data && !data.error) {
            setAiMap((prev) => ({ ...prev, [sym]: data }));
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingAi((prev) => { const n = new Set(prev); n.delete(sym); return n; });
        });
    });
  }, [tickerData, aiMap, loadingAi]);

  return (
    <div className="space-y-4">
      {tickerData.map((data) => {
        const sym = data.quote.symbol;
        const ai = aiMap[sym];
        const isLoading = loadingAi.has(sym);
        const action = ai?.action ?? "HOLD";
        const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

        return (
          <div key={sym} className="space-y-3">
            <StockHeader data={data} />

            {/* AI Analysis Card */}
            <div className="rounded-2xl bg-bg-surface p-5">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-info">
                <Sparkles size={14} />
                Smart Analysis
              </div>

              {isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                  <Loader2 size={12} className="animate-spin" />
                  Analyzing...
                </div>
              ) : ai ? (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}>{action}</span>
                    {ai.targetUpside > 0 && (
                      <span className="text-xs font-bold text-bullish">+{ai.targetUpside}% target</span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">{ai.summary}</p>

                  <div className="mt-3 space-y-1">
                    <ScoreBar label="Technical" score={ai.technicalScore} color="bg-info" />
                    <ScoreBar label="Fundamental" score={ai.fundamentalScore} color="bg-bullish" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ai.intrinsicValue && (
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[10px] text-text-secondary">Intrinsic Value</div>
                        <div className="mt-1 text-xl font-bold text-bullish">${ai.intrinsicValue}</div>
                      </div>
                    )}
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-[10px] text-text-secondary">Drop Type</div>
                      <div className={`mt-1 text-xl font-bold ${ai.dropReason === "SENTIMENT" ? "text-bullish" : ai.dropReason === "STRUCTURAL" ? "text-bearish" : ""}`}>
                        {ai.dropReason}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-text-secondary">Economic Moat</div>
                      <div className="flex items-center gap-1">
                        <Shield size={10} className="text-bullish" />
                        <MoatDots score={ai.moatScore} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">{ai.moatReason}</p>
                  </div>

                  {ai.buyAtPrice && (
                    <div className="mt-3 rounded-xl bg-bullish/5 p-3 text-xs">
                      <span className="font-bold text-bullish">Buy at: ${ai.buyAtPrice}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-3 text-xs text-text-secondary">Analysis unavailable</div>
              )}
            </div>

            {/* Link to full detail */}
            <Link
              href={`/stock/${sym}`}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-bg-surface py-3 text-xs font-medium text-info hover:bg-info/5 transition-colors"
            >
              Full Detail Page <ArrowRight size={12} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
