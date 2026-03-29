"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Sparkles, Info } from "lucide-react";

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
  moat: string;
  dropReason: string;
  dropExplanation: string;
  intrinsicValue: number | null;
  buyAtPrice: number | null;
  summary: string;
}

const SIGNAL_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  "BUY MORE": { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral" },
};

function ExplainerCard({ title, value, explanation }: { title: string; value: string; explanation: string }) {
  return (
    <div className="rounded-2xl bg-bg-surface p-4">
      <div className="text-[10px] font-medium text-text-secondary">{title}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="mt-2 flex gap-1.5 text-[11px] text-text-secondary leading-relaxed">
        <Info size={12} className="mt-0.5 shrink-0 text-info" />
        <span>{explanation}</span>
      </div>
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

    // Fetch quote + technical data
    fetch(`/api/quotes?symbols=${symbol}&analyze=true`)
      .then((r) => r.json())
      .then((d) => setData(d[symbol] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch AI analysis in parallel
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
  const signal = data.signal ?? "HOLD";
  const style = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.HOLD;

  // Price position in 52-week range
  const range52 = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
  const pricePos = range52 > 0 ? ((data.price - data.fiftyTwoWeekLow) / range52) * 100 : 50;

  // SMA relationships for explanations
  const aboveSma50 = data.price > data.sma50;
  const aboveSma150 = data.price > data.sma150;
  const aboveSma200 = data.price > data.sma200;
  const sma50Above150 = data.sma50 > data.sma150;

  let trendExplanation: string;
  if (aboveSma50 && sma50Above150 && aboveSma200) {
    trendExplanation = "The stock is in a strong uptrend. All moving averages are lined up bullishly (50 > 150 > 200). This is the ideal condition Adam Khoo looks for in long-term holds.";
  } else if (!aboveSma50 && aboveSma150) {
    trendExplanation = "The stock has pulled back below its short-term average (50 SMA) but is still above the medium-term (150 SMA). This could be a buying opportunity if the stock bounces off the 150 SMA support.";
  } else if (!aboveSma200) {
    trendExplanation = "The stock is trading below its 200-day moving average, which means it's in a downtrend. Adam Khoo would say wait for it to get back above the 200 SMA before buying, unless you believe the drop is purely sentiment-driven.";
  } else if (!sma50Above150) {
    trendExplanation = "The trend is transitioning — the 50 SMA has crossed below the 150 SMA. This is a warning sign. Wait for the moving averages to realign before adding to your position.";
  } else {
    trendExplanation = "Mixed signals. The stock is above some moving averages but the trend isn't clearly bullish. Be cautious and wait for a clearer setup.";
  }

  let rsiExplanation: string;
  if (data.rsi < 30) {
    rsiExplanation = `RSI is at ${data.rsi} — this means the stock is oversold. Sellers have pushed the price down hard and it may be due for a bounce. Combined with a good uptrend, this is often a great entry point.`;
  } else if (data.rsi < 40) {
    rsiExplanation = `RSI is at ${data.rsi} — approaching oversold territory. The selling pressure is getting exhausted. If the long-term trend is still up, this pullback could be a buying opportunity.`;
  } else if (data.rsi > 70) {
    rsiExplanation = `RSI is at ${data.rsi} — the stock is overbought. Too many buyers have pushed the price up too fast. It may pull back soon. Not the best time to buy, even if you like the company.`;
  } else {
    rsiExplanation = `RSI is at ${data.rsi} — this is neutral territory. The stock isn't particularly overbought or oversold. No strong timing signal from RSI right now.`;
  }

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-2xl">
          <button onClick={() => router.back()} className="rounded-full p-1 hover:bg-bg-surface">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{symbol}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>{signal}</span>
            </div>
            <div className="text-xs text-text-secondary">{data.name}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">${data.price.toFixed(2)}</div>
            <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
              {positive ? "+" : ""}{data.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-4 sm:max-w-2xl">
        {/* Signal Card */}
        <div className={`rounded-2xl p-5 ${style.bg}`}>
          <div className={`text-sm font-bold ${style.text}`}>Signal: {signal}</div>
          <div className="mt-1 text-sm leading-relaxed">{data.reason}</div>
          {data.buyAt && (
            <div className="mt-2 text-sm">
              <span className="font-bold text-bullish">Buy at: ${data.buyAt}</span>
              <span className="text-text-secondary ml-1">
                ({((data.buyAt - data.price) / data.price * 100).toFixed(1)}% from current)
              </span>
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-info">
            <Sparkles size={14} />
            Adam Khoo Analysis
          </div>
          {aiLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 size={12} className="animate-spin" />
              Analyzing with Gemini 3.1 Pro...
            </div>
          ) : ai ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-relaxed">{ai.summary}</p>

              <div className="grid grid-cols-2 gap-2">
                {ai.intrinsicValue && (
                  <div className="rounded-xl bg-white p-3">
                    <div className="text-[10px] text-text-secondary">Intrinsic Value</div>
                    <div className="text-lg font-bold text-bullish">${ai.intrinsicValue}</div>
                    <div className="text-[10px] text-text-secondary">
                      {data.price < ai.intrinsicValue
                        ? `${(((ai.intrinsicValue - data.price) / data.price) * 100).toFixed(0)}% upside`
                        : `${(((data.price - ai.intrinsicValue) / data.price) * 100).toFixed(0)}% overvalued`}
                    </div>
                  </div>
                )}
                <div className="rounded-xl bg-white p-3">
                  <div className="text-[10px] text-text-secondary">Drop Type</div>
                  <div className={`text-lg font-bold ${ai.dropReason === "SENTIMENT" ? "text-bullish" : ai.dropReason === "STRUCTURAL" ? "text-bearish" : "text-text-primary"}`}>
                    {ai.dropReason}
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {ai.dropReason === "SENTIMENT" ? "Buying opportunity" : ai.dropReason === "STRUCTURAL" ? "Be cautious" : "No significant drop"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-3">
                <div className="text-[10px] font-medium text-text-secondary">Economic Moat</div>
                <p className="mt-1 text-xs leading-relaxed">{ai.moat}</p>
              </div>

              {ai.dropExplanation && (
                <div className="rounded-xl bg-white p-3">
                  <div className="text-[10px] font-medium text-text-secondary">Why did it drop?</div>
                  <p className="mt-1 text-xs leading-relaxed">{ai.dropExplanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-xs text-text-secondary">Analysis unavailable</div>
          )}
        </div>

        {/* 52-Week Range */}
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="text-[10px] font-medium text-text-secondary">52-Week Range</div>
          <div className="mt-2 flex justify-between text-xs text-text-secondary">
            <span>${data.fiftyTwoWeekLow.toFixed(2)}</span>
            <span>${data.fiftyTwoWeekHigh.toFixed(2)}</span>
          </div>
          <div className="relative mt-1 h-2 rounded-full bg-border">
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info ring-2 ring-white"
              style={{ left: `${Math.min(Math.max(pricePos, 3), 97)}%` }}
            />
          </div>
          <div className="mt-3 flex gap-1.5 text-[11px] text-text-secondary leading-relaxed">
            <Info size={12} className="mt-0.5 shrink-0 text-info" />
            <span>
              {pricePos < 20
                ? "The stock is near its 52-week low. This could mean it's cheap — or that something is wrong. Check the moat and drop type above to decide."
                : pricePos > 80
                  ? "The stock is near its 52-week high. It's been doing well, but buying here means less margin of safety. Adam Khoo prefers to buy on pullbacks."
                  : "The stock is in the middle of its 52-week range. Look at the trend and support levels below to decide on timing."}
            </span>
          </div>
        </div>

        {/* Price Action — Plain English */}
        <div className="text-sm font-semibold px-1">Price Action</div>

        <ExplainerCard
          title="Trend (Moving Averages)"
          value={aboveSma50 && sma50Above150 ? "Uptrend ↑" : !aboveSma200 ? "Downtrend ↓" : "Transitioning →"}
          explanation={trendExplanation}
        />

        <div className="grid grid-cols-3 gap-2">
          <ExplainerCard
            title="50 SMA"
            value={`$${data.sma50.toFixed(0)}`}
            explanation={aboveSma50
              ? "Price is above. Short-term trend is up."
              : "Price is below. Short-term trend is weak."}
          />
          <ExplainerCard
            title="150 SMA"
            value={`$${data.sma150.toFixed(0)}`}
            explanation={aboveSma150
              ? "Price is above. Medium-term trend supports the stock."
              : "Price is below. The medium-term trend has turned."}
          />
          <ExplainerCard
            title="200 SMA"
            value={`$${data.sma200.toFixed(0)}`}
            explanation={aboveSma200
              ? "Price is above. Long-term trend is intact."
              : "Price has broken below. Long-term trend is broken."}
          />
        </div>

        <ExplainerCard
          title="RSI (Relative Strength Index)"
          value={data.rsi.toString()}
          explanation={rsiExplanation}
        />

        {/* What Adam Khoo Would Do */}
        <div className="rounded-2xl bg-info/5 p-5">
          <div className="text-sm font-semibold text-info">What would Adam Khoo do?</div>
          <div className="mt-2 text-sm leading-relaxed text-text-primary">
            {signal === "BUY" || signal === "BUY MORE"
              ? `The stock shows a buying setup. ${data.buyAt ? `Wait for price to reach $${data.buyAt} (the 50 SMA support level) for a better entry with margin of safety.` : "The current price is near support."} Adam Khoo calls this a "Trend Retracement" entry — buying a good stock during a temporary pullback in an uptrend.`
              : signal === "SELL"
                ? "The stock is in a downtrend with both moving averages pointing down. Adam Khoo would cut losses here and redeploy the capital into stronger stocks. Don't hold onto losers hoping they'll come back."
                : signal === "WATCH"
                  ? `The trend is unclear right now. Adam Khoo would say: "Don't try to catch a falling knife." Wait for the 50 SMA to cross back above the 150 SMA with both sloping up before adding to this position.`
                  : "Hold your current position. The trend is intact but there's no specific entry signal right now. Be patient and wait for a pullback to the 50 SMA for a better entry point if you want to add more."
            }
          </div>
        </div>
      </div>
    </div>
  );
}
