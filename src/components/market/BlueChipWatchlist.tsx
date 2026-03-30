"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Shield, ArrowRight } from "lucide-react";

const BLUE_CHIPS = ["AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "META", "V", "MA", "UNH", "NOW"];

interface ChipQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sma50: number;
  sma150: number;
  rsi: number;
  signal: string;
  reason: string;
  buyAt: number | null;
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

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
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

function MoatDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-1.5 w-3 rounded-full ${i <= score ? "bg-bullish" : "bg-border"}`} />
      ))}
    </div>
  );
}

export default function BlueChipWatchlist() {
  const [quotes, setQuotes] = useState<Record<string, ChipQuote>>({});
  const [aiData, setAiData] = useState<Record<string, AiData>>({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    // Fetch quotes with technical analysis
    fetch(`/api/quotes?symbols=${BLUE_CHIPS.join(",")}&analyze=true`)
      .then((r) => r.json())
      .then(setQuotes)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Batch AI analysis for all blue chips
    fetch(`/api/quotes?symbols=${BLUE_CHIPS.join(",")}&analyze=true`)
      .then((r) => r.json())
      .then((quotesData) => {
        // Build compact summary for Gemini
        const stockSummaries = BLUE_CHIPS.map((t) => {
          const d = quotesData[t];
          if (!d) return `${t}: no data`;
          return `${t}(${d.name}): $${d.price}, ${d.changePercent}%, 50SMA $${d.sma50}, 150SMA $${d.sma150}, RSI ${d.rsi}`;
        }).join("\n");

        return fetch("/api/bluechip-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockSummaries }),
        });
      })
      .then((r) => r?.ok ? r.json() : {})
      .then((data) => { if (data && !(data as Record<string, unknown>).error) setAiData(data); })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="text-sm font-semibold">Blue Chip Moat Stocks</div>
        <div className="mt-4 flex items-center justify-center gap-2 text-text-secondary">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 px-1">
        <div className="text-sm font-semibold">Blue Chip Moat Stocks</div>
        <div className="text-xs text-text-secondary">Strong moat companies — value picks</div>
      </div>

      <div className="space-y-2">
        {BLUE_CHIPS.map((sym) => {
          const q = quotes[sym];
          const ai = aiData[sym] as AiData | undefined;
          if (!q) return null;

          const action = ai?.action ?? q.signal ?? "HOLD";
          const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;
          const positive = q.changePercent >= 0;

          return (
            <Link
              key={sym}
              href={`/stock/${sym}`}
              className="block rounded-2xl bg-bg-surface p-4 transition-all hover:shadow-md active:scale-[0.98]"
            >
              {/* Row 1: Ticker + Action + Price */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{sym}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>
                      {action}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary">{q.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">${q.price.toFixed(2)}</div>
                  <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                    {positive ? "+" : ""}{q.changePercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {ai ? (
                <>
                  {/* Score bars */}
                  <div className="mt-3 space-y-1">
                    <ScoreBar label="Technical" score={ai.technicalScore} color="bg-info" />
                    <ScoreBar label="Fundamental" score={ai.fundamentalScore} color="bg-bullish" />
                  </div>

                  {/* Target + RSI + Moat */}
                  <div className="mt-2.5 flex items-center gap-3 text-[10px]">
                    {ai.targetUpside > 0 && (
                      <span className="font-bold text-bullish">+{ai.targetUpside}% target</span>
                    )}
                    <span className="text-text-secondary">RSI {q.rsi}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Shield size={10} className="text-bullish" />
                      <MoatDots score={ai.moatScore} />
                    </div>
                  </div>

                  {/* Buy signal */}
                  {(ai.buyAtPrice ?? q.buyAt) && (
                    <div className="mt-2 rounded-lg bg-bullish/5 px-3 py-1.5 text-[11px]">
                      <span className="font-bold text-bullish">
                        {q.price <= (ai.buyAtPrice ?? q.buyAt ?? 0)
                          ? "🟢 At buy zone — good entry"
                          : q.price <= (ai.buyAtPrice ?? q.buyAt ?? 0) * 1.05
                            ? "🟡 Near buy zone — start small"
                            : `Wait for $${ai.buyAtPrice ?? q.buyAt}`
                        }
                      </span>
                    </div>
                  )}

                  {/* Analysis */}
                  <div className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    ↗ {ai.analysis}
                  </div>

                  <div className="mt-2 flex items-center justify-end text-[10px] text-info">
                    Full Analysis <ArrowRight size={10} className="ml-1" />
                  </div>
                </>
              ) : aiLoading ? (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-text-secondary">
                  <Loader2 size={10} className="animate-spin" /> Analyzing...
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-end text-[10px] text-info">
                  Full Analysis <ArrowRight size={10} className="ml-1" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
