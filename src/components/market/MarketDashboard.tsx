"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { getHistory, calculateSMA } from "@/lib/data-service";
import {
  calculateSlope,
  calculateSentimentScore,
  getMarketRegime,
} from "@/lib/market-utils";
import { Loader2, RefreshCw } from "lucide-react";
import SentimentScore from "./SentimentScore";
import IndexBar from "./IndexBar";
import VixGauge from "./VixGauge";
import SpxTrendCard from "./SpxTrendCard";
import TreasuryCard from "./TreasuryCard";
import FearGreedGauge from "./FearGreedGauge";
import BlueChipWatchlist from "./BlueChipWatchlist";
import SmallCapPlays from "./SmallCapPlays";

interface QuoteWithAnalysis {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  sma50?: number;
  sma150?: number;
  sma200?: number;
  rsi?: number;
  signal?: string;
  reason?: string;
  buyAt?: number | null;
}

interface MarketState {
  quotes: Record<string, QuoteWithAnalysis>;
  spxCloses: number[];
}

export default function MarketDashboard() {
  const [data, setData] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMarketData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      const [quotes, spxHistory] = await Promise.all([
        fetch("/api/quotes?symbols=VOO,QQQ,VTWO,%5EVIX,%5ETNX&analyze=true").then((r) => r.json()),
        getHistory("^GSPC"),
      ]);
      const spxCloses = spxHistory.map((p: { close: number }) => p.close);
      setData({ quotes, spxCloses });
    } catch {
      setError("Failed to load market data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMarketData();
  }, [loadMarketData]);

  const sentiment = useMemo(() => {
    if (!data || data.spxCloses.length === 0) return null;

    const vixQuote = data.quotes["^VIX"];
    const vixLevel = vixQuote?.price ?? 20;

    const closes = data.spxCloses;
    const sma50Arr = calculateSMA(closes, 50);
    const sma150Arr = calculateSMA(closes, 150);
    const sma200Arr = calculateSMA(closes, 200);

    const spxPrice = closes[closes.length - 1] ?? 0;
    const sma50 = sma50Arr[sma50Arr.length - 1] ?? 0;
    const sma150 = sma150Arr[sma150Arr.length - 1] ?? 0;
    const sma200 = sma200Arr[sma200Arr.length - 1] ?? 0;

    const slope50 = calculateSlope([...sma50Arr].reverse());
    const slope150 = calculateSlope([...sma150Arr].reverse());
    const slope200 = calculateSlope([...sma200Arr].reverse());

    const regime = getMarketRegime(spxPrice, sma50, sma150, sma200, slope50, slope150, slope200);
    return { ...calculateSentimentScore(vixLevel, regime, []), regime, sma50, sma150, sma200, slope50, slope150, slope200, spxPrice };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="h-4 w-32 rounded-full bg-border" />
          <div className="mt-3 h-8 w-24 rounded-full bg-border" />
          <div className="mt-3 h-3 w-full rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading market data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-bearish/10 bg-bearish/5 p-8 text-center">
        <div className="text-sm font-semibold text-bearish">{error ?? "No market data"}</div>
        <button
          onClick={() => loadMarketData()}
          className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-text-primary shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-bold">Market Dashboard</div>
          <div className="text-xs text-text-secondary">Live index pulse and watchlists</div>
        </div>
        <button
          onClick={() => loadMarketData("refresh")}
          disabled={refreshing}
          className="flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {sentiment && (
        <SentimentScore
          score={sentiment.score}
          label={sentiment.label}
          color={sentiment.color}
          commentary={sentiment.commentary}
        />
      )}

      <IndexBar
        voo={data.quotes["VOO"]}
        qqq={data.quotes["QQQ"]}
        vtwo={data.quotes["VTWO"]}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <VixGauge vix={data.quotes["^VIX"]} />
        {sentiment && (
          <SpxTrendCard
            regime={sentiment.regime}
            spxPrice={sentiment.spxPrice}
            sma50={sentiment.sma50}
            sma150={sentiment.sma150}
            sma200={sentiment.sma200}
            slope50={sentiment.slope50}
            slope150={sentiment.slope150}
            slope200={sentiment.slope200}
          />
        )}
        <TreasuryCard tnx={data.quotes["^TNX"]} />
        <FearGreedGauge />
      </div>

      <BlueChipWatchlist />

      <SmallCapPlays />
    </div>
  );
}
