"use client";

import { useEffect, useState, useMemo } from "react";
import { getQuotes, getHistory, calculateSMA, type StockQuote, type HistoricalPrice } from "@/lib/data-service";
import {
  calculateSlope,
  calculateSentimentScore,
  getMarketRegime,
} from "@/lib/market-utils";
import { Loader2 } from "lucide-react";
import SentimentScore from "./SentimentScore";
import IndexBar from "./IndexBar";
import VixGauge from "./VixGauge";
import SpxTrendCard from "./SpxTrendCard";
import TreasuryCard from "./TreasuryCard";
import FearGreedGauge from "./FearGreedGauge";
import BlueChipWatchlist from "./BlueChipWatchlist";

interface MarketDashboardProps {
  onTickerClick?: (ticker: string) => void;
}

interface MarketState {
  quotes: Record<string, StockQuote>;
  spxHistory: HistoricalPrice[];
}

export default function MarketDashboard({ onTickerClick }: MarketDashboardProps) {
  const [data, setData] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getQuotes(["VOO", "QQQ", "VTWO", "^VIX", "^TNX"]),
      getHistory("^GSPC"),
    ])
      .then(([quotes, spxHistory]) => {
        if (!cancelled) setData({ quotes, spxHistory });
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load market data. Yahoo Finance may be blocked.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const sentiment = useMemo(() => {
    if (!data) return null;

    const vixQuote = data.quotes["^VIX"];
    const vixLevel = vixQuote?.price ?? 20;

    // Calculate SMAs from SPX history
    const closes = data.spxHistory.map((p) => p.close).reverse(); // oldest first
    const sma50Arr = calculateSMA(closes, 50);
    const sma150Arr = calculateSMA(closes, 150);
    const sma200Arr = calculateSMA(closes, 200);

    const spxPrice = closes[closes.length - 1] ?? 0;
    const sma50 = sma50Arr[sma50Arr.length - 1] ?? 0;
    const sma150 = sma150Arr[sma150Arr.length - 1] ?? 0;
    const sma200 = sma200Arr[sma200Arr.length - 1] ?? 0;

    // Calculate slopes (newest first for slope function)
    const slope50 = calculateSlope([...sma50Arr].reverse());
    const slope150 = calculateSlope([...sma150Arr].reverse());
    const slope200 = calculateSlope([...sma200Arr].reverse());

    const regime = getMarketRegime(spxPrice, sma50, sma150, sma200, slope50, slope150, slope200);

    // Fake sectors for sentiment calc (we don't have sector data from Yahoo)
    return { ...calculateSentimentScore(vixLevel, regime, []), regime, sma50, sma150, sma200, slope50, slope150, slope200, spxPrice };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading market data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-bearish/5 p-8 text-center text-sm text-bearish">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const voo = data.quotes["VOO"] ?? null;
  const qqq = data.quotes["QQQ"] ?? null;
  const vtwo = data.quotes["VTWO"] ?? null;
  const vix = data.quotes["^VIX"] ?? null;
  const tnx = data.quotes["^TNX"] ?? null;

  return (
    <div className="space-y-3">
      {sentiment && (
        <SentimentScore
          score={sentiment.score}
          label={sentiment.label}
          color={sentiment.color}
          commentary={sentiment.commentary}
        />
      )}

      <IndexBar voo={voo} qqq={qqq} vtwo={vtwo} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <VixGauge vix={vix} />
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
        <TreasuryCard tnx={tnx} />
        <FearGreedGauge />
      </div>

      <BlueChipWatchlist onTickerClick={onTickerClick} />
    </div>
  );
}
