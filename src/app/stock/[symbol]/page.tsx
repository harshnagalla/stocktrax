"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Sparkles, Info, Shield } from "lucide-react";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
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
  moatDuration: string;
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

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/10", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/10", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/10", text: "text-neutral" },
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

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-bg-surface p-4">
      <div className="text-[10px] font-medium text-text-secondary">{label}</div>
      <div className="mt-1">{children}</div>
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

  useEffect(() => {
    if (!symbol) return;
    fetch(`/api/quotes?symbols=${symbol}&analyze=true`)
      .then((r) => r.json())
      .then((d) => setData(d[symbol] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/analysis?symbol=${symbol}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setAi(d))
      .catch(() => {})
      .finally(() => setAiLoading(false));
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
  const action = ai?.action ?? data.signal ?? "HOLD";
  const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

  const range52 = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
  const pricePos = range52 > 0 ? ((data.price - data.fiftyTwoWeekLow) / range52) * 100 : 50;

  const aboveSma50 = data.price > data.sma50;
  const aboveSma150 = data.price > data.sma150;
  const aboveSma200 = data.price > data.sma200;
  const sma50Above150 = data.sma50 > data.sma150;

  let trendLabel: string;
  let trendExplanation: string;
  if (aboveSma50 && sma50Above150 && aboveSma200) {
    trendLabel = "Uptrend ↑";
    trendExplanation = "All moving averages are lined up bullishly. This is the ideal condition for buying.";
  } else if (!aboveSma50 && aboveSma150) {
    trendLabel = "Correction →";
    trendExplanation = "Price pulled back below 50 SMA but still above 150 SMA. Could be a buying opportunity if it bounces.";
  } else if (!aboveSma200) {
    trendLabel = "Downtrend ↓";
    trendExplanation = "Price below 200 SMA. Wait for it to get back above before buying.";
  } else {
    trendLabel = "Transitioning →";
    trendExplanation = "Trend is unclear. 50 SMA crossing 150 SMA. Wait for clarity.";
  }

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

        {/* AI Analysis — Main Card */}
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-info">
            <Sparkles size={14} />
            Smart Analysis
          </div>

          {aiLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 size={12} className="animate-spin" />
              Analyzing with Gemini...
            </div>
          ) : ai ? (
            <>
              <p className="mt-3 text-sm leading-relaxed">{ai.summary}</p>

              {/* Score Bars */}
              <div className="mt-4 space-y-2">
                <ScoreBar label="Technical" score={ai.technicalScore} color="bg-info" />
                <ScoreBar label="Fundamental" score={ai.fundamentalScore} color="bg-bullish" />
              </div>

              {/* Intrinsic Value + Drop Type */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ai.intrinsicValue && (
                  <div className="rounded-xl bg-white p-4">
                    <div className="text-[10px] text-text-secondary">Intrinsic Value</div>
                    <div className="mt-1 text-2xl font-bold text-bullish">${ai.intrinsicValue}</div>
                    <div className="text-xs text-text-secondary">
                      {data.price < ai.intrinsicValue
                        ? `${Math.round(((ai.intrinsicValue - data.price) / data.price) * 100)}% upside`
                        : `${Math.round(((data.price - ai.intrinsicValue) / data.price) * 100)}% overvalued`}
                    </div>
                  </div>
                )}
                <div className="rounded-xl bg-white p-4">
                  <div className="text-[10px] text-text-secondary">Drop Type</div>
                  <div className={`mt-1 text-2xl font-bold ${ai.dropReason === "SENTIMENT" ? "text-bullish" : ai.dropReason === "STRUCTURAL" ? "text-bearish" : "text-text-primary"}`}>
                    {ai.dropReason}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {ai.dropReason === "SENTIMENT" ? "Buying opportunity" : ai.dropReason === "STRUCTURAL" ? "Be cautious" : "No significant drop"}
                  </div>
                </div>
              </div>

              {/* Economic Moat */}
              <div className="mt-3 rounded-xl bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-text-secondary">Economic Moat</div>
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-bullish" />
                    <MoatDots score={ai.moatScore} />
                    <span className="text-[10px] font-bold text-text-secondary ml-1">{ai.moatType}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{ai.moatReason}</p>
                {ai.moatDuration && (
                  <p className="mt-1 text-xs text-text-secondary">Expected to last: {ai.moatDuration}</p>
                )}
              </div>

              {/* Why did it drop? */}
              {ai.dropExplanation && (
                <div className="mt-3 rounded-xl bg-white p-4">
                  <div className="text-[10px] text-text-secondary">Why did it drop?</div>
                  <p className="mt-1 text-sm leading-relaxed">{ai.dropExplanation}</p>
                </div>
              )}

              {/* Target + Moat Score */}
              {ai.targetUpside > 0 && (
                <div className="mt-3 text-sm">
                  <span className="font-bold text-bullish">+{ai.targetUpside}% target</span>
                  <span className="text-text-secondary ml-2">to intrinsic value</span>
                </div>
              )}
            </>
          ) : (
            <div className="mt-3 text-xs text-text-secondary">Analysis unavailable</div>
          )}
        </div>

        {/* Support Levels */}
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="text-xs font-semibold mb-3">Support Levels</div>
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Short-Term Support (50 SMA)">
              <div className="text-xl font-bold">${data.sma50.toFixed(0)}</div>
              <div className="mt-1 flex gap-1.5 text-[10px] text-text-secondary leading-relaxed">
                <Info size={10} className="mt-0.5 shrink-0 text-info" />
                <span>{aboveSma50 ? "Price is above. Short-term trend intact." : "Price broke below. May bounce here or fall further."}</span>
              </div>
            </InfoCard>
            <InfoCard label="Long-Term Support (150 SMA)">
              <div className="text-xl font-bold">${data.sma150.toFixed(0)}</div>
              <div className="mt-1 flex gap-1.5 text-[10px] text-text-secondary leading-relaxed">
                <Info size={10} className="mt-0.5 shrink-0 text-info" />
                <span>{aboveSma150 ? "Price above. Medium-term uptrend holds." : "Broken below. Trend is weakening."}</span>
              </div>
            </InfoCard>
          </div>
          {ai?.shortTermSupport && ai?.longTermSupport && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <InfoCard label="AI Short-Term Support">
                <div className="text-xl font-bold text-info">${ai.shortTermSupport}</div>
              </InfoCard>
              <InfoCard label="AI Long-Term Support">
                <div className="text-xl font-bold text-info">${ai.longTermSupport}</div>
              </InfoCard>
            </div>
          )}
          <InfoCard label="200 SMA (Last Line of Defense)">
            <div className="text-xl font-bold">${data.sma200.toFixed(0)}</div>
            <div className="mt-1 flex gap-1.5 text-[10px] text-text-secondary leading-relaxed">
              <Info size={10} className="mt-0.5 shrink-0 text-info" />
              <span>{aboveSma200 ? "Price above. Long-term trend is intact. Good sign." : "Price below the 200 SMA. This is a red flag — the long-term trend is broken."}</span>
            </div>
          </InfoCard>
        </div>

        {/* Buy Signal */}
        {(ai?.buyAtPrice ?? data.buyAt) && (
          <div className="rounded-2xl bg-bullish/5 p-5">
            <div className="text-sm font-bold text-bullish">
              {data.price <= (ai?.buyAtPrice ?? data.buyAt ?? 0)
                ? "🟢 At buy zone — good entry point"
                : data.price <= (ai?.buyAtPrice ?? data.buyAt ?? 0) * 1.05
                  ? "🟡 Almost at buy zone — consider starting a small position"
                  : `⏳ Wait for $${ai?.buyAtPrice ?? data.buyAt} to buy`
              }
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              Buy target: ${ai?.buyAtPrice ?? data.buyAt} ({((((ai?.buyAtPrice ?? data.buyAt ?? data.price) - data.price) / data.price) * 100).toFixed(1)}% from current)
            </div>
          </div>
        )}

        {/* 52-Week Range */}
        <InfoCard label="52-Week Range">
          <div className="flex justify-between text-xs text-text-secondary mt-1">
            <span>${data.fiftyTwoWeekLow.toFixed(2)}</span>
            <span>${data.fiftyTwoWeekHigh.toFixed(2)}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-border">
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info ring-2 ring-white"
              style={{ left: `${Math.min(Math.max(pricePos, 3), 97)}%` }}
            />
          </div>
          <div className="mt-2 flex gap-1.5 text-[10px] text-text-secondary leading-relaxed">
            <Info size={10} className="mt-0.5 shrink-0 text-info" />
            <span>
              {pricePos < 20
                ? "Near 52-week lows. Could be cheap or could be falling for a reason — check the moat and drop type."
                : pricePos > 80
                  ? "Near highs. Less margin of safety. Better to buy on pullbacks."
                  : "In the middle of its range. Check support levels for entry timing."}
            </span>
          </div>
        </InfoCard>

        {/* Trend + RSI */}
        <div className="grid grid-cols-2 gap-2">
          <InfoCard label="Trend">
            <div className="text-lg font-bold">{trendLabel}</div>
            <div className="mt-1 flex gap-1.5 text-[10px] text-text-secondary leading-relaxed">
              <Info size={10} className="mt-0.5 shrink-0 text-info" />
              <span>{trendExplanation}</span>
            </div>
          </InfoCard>
          <InfoCard label="RSI (Momentum)">
            <div className={`text-lg font-bold ${data.rsi < 30 ? "text-bearish" : data.rsi > 70 ? "text-bullish" : ""}`}>
              {data.rsi}
            </div>
            <div className="mt-1 flex gap-1.5 text-[10px] text-text-secondary leading-relaxed">
              <Info size={10} className="mt-0.5 shrink-0 text-info" />
              <span>
                {data.rsi < 30
                  ? "Oversold — sellers exhausted, may bounce soon."
                  : data.rsi > 70
                    ? "Overbought — may pull back. Not ideal entry."
                    : "Neutral — no strong momentum signal."}
              </span>
            </div>
          </InfoCard>
        </div>

        {/* Action Plan */}
        <div className="rounded-2xl bg-info/5 p-5">
          <div className="text-sm font-semibold text-info mb-3">What should you do?</div>

          <div className="space-y-2">
            {/* Action */}
            <div className="rounded-xl bg-white p-3">
              <div className="text-[10px] text-text-secondary">Action</div>
              <div className={`mt-1 text-lg font-bold ${style.text}`}>{action}</div>
            </div>

            {/* Checklist */}
            <div className="rounded-xl bg-white p-3 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className={aboveSma200 ? "text-bullish" : "text-bearish"}>{aboveSma200 ? "✅" : "❌"}</span>
                <span>Above 200 SMA — {aboveSma200 ? "Long-term trend intact" : "Long-term trend broken"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={sma50Above150 ? "text-bullish" : "text-bearish"}>{sma50Above150 ? "✅" : "❌"}</span>
                <span>50 SMA above 150 SMA — {sma50Above150 ? "Uptrend confirmed" : "Trend weakening"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={data.rsi < 40 ? "text-bullish" : data.rsi > 70 ? "text-bearish" : "text-text-secondary"}>{data.rsi < 40 ? "✅" : data.rsi > 70 ? "❌" : "➖"}</span>
                <span>RSI {data.rsi} — {data.rsi < 30 ? "Oversold, potential bounce" : data.rsi < 40 ? "Approaching oversold, good timing" : data.rsi > 70 ? "Overbought, wait for pullback" : "Neutral timing"}</span>
              </div>
              {ai && (
                <div className="flex items-start gap-2">
                  <span className={ai.dropReason === "SENTIMENT" ? "text-bullish" : ai.dropReason === "STRUCTURAL" ? "text-bearish" : "text-text-secondary"}>
                    {ai.dropReason === "SENTIMENT" ? "✅" : ai.dropReason === "STRUCTURAL" ? "❌" : "➖"}
                  </span>
                  <span>Drop type: {ai.dropReason} — {ai.dropReason === "SENTIMENT" ? "Temporary, buying opportunity" : ai.dropReason === "STRUCTURAL" ? "Fundamental problem, be cautious" : "No significant drop"}</span>
                </div>
              )}
            </div>

            {/* Recommendation */}
            <div className="rounded-xl bg-white p-3">
              <div className="text-[10px] text-text-secondary">Recommendation</div>
              <p className="mt-1 text-sm leading-relaxed">
                {action === "BUY"
                  ? `Buy setup. ${data.buyAt ? `Enter near $${data.buyAt} (50 SMA support).` : "Near support."} Start with a small position (25-50% of planned allocation). Add more if it dips to $${data.sma150.toFixed(0)} (150 SMA).`
                  : action === "SELL"
                    ? `Cut losses. Redeploy capital into stocks with better setups. The stock is below its 200 SMA ($${data.sma200.toFixed(0)}) — this means the long-term trend is broken.`
                    : action === "WATCH"
                      ? `Don't buy yet. Wait for 50 SMA ($${data.sma50.toFixed(0)}) to cross above 150 SMA ($${data.sma150.toFixed(0)}). Set a price alert at $${data.sma150.toFixed(0)}.`
                      : `Hold. Uptrend intact. If adding, wait for price to pull back to $${data.sma50.toFixed(0)} (50 SMA) for better entry. Don't chase the price up.`
                }
              </p>
            </div>

            {/* Position sizing */}
            <div className="rounded-xl bg-white p-3">
              <div className="text-[10px] text-text-secondary">Position Sizing Rules</div>
              <div className="mt-1 space-y-1 text-xs text-text-secondary">
                <div>• Risk 1.5-3% of total capital per stock</div>
                <div>• Stop loss: 5-8% below purchase price</div>
                <div>• Max 8-10 stocks in portfolio</div>
                <div>• Keep 10% in cash always</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
