"use client";

import { useEffect, useState, useMemo } from "react";
import type { FMPClient } from "@/lib/fmp/client";
import type { MarketData } from "@/lib/fmp/types";
import {
  calculateSlope,
  calculateSentimentScore,
  extractIndicatorValues,
  getMarketRegime,
} from "@/lib/market-utils";
import { Loader2 } from "lucide-react";
import SentimentScore from "./SentimentScore";
import IndexBar from "./IndexBar";
import VixGauge from "./VixGauge";
import SpxTrendCard from "./SpxTrendCard";
import TreasuryCard from "./TreasuryCard";
import FearGreedGauge from "./FearGreedGauge";
import SectorGrid from "./SectorGrid";
import MarketMovers from "./MarketMovers";
import EconomicCalendar from "./EconomicCalendar";

interface MarketDashboardProps {
  client: FMPClient | null;
  onRequestCountUpdate: () => void;
}

export default function MarketDashboard({
  client,
  onRequestCountUpdate,
}: MarketDashboardProps) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    client
      .fetchMarketData()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          onRequestCountUpdate();
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to fetch market data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, onRequestCountUpdate]);

  const sentiment = useMemo(() => {
    if (!data) return null;

    const vixLevel = data.vix?.price ?? 20;
    const spxPrice = data.spxHistory[0]?.close ?? 0;
    const sma50Values = extractIndicatorValues(data.spxSma50, "sma");
    const sma150Values = extractIndicatorValues(data.spxSma150, "sma");
    const sma200Values = extractIndicatorValues(data.spxSma200, "sma");

    const regime = getMarketRegime(
      spxPrice,
      sma50Values[0] ?? 0,
      sma150Values[0] ?? 0,
      sma200Values[0] ?? 0,
      calculateSlope(sma50Values),
      calculateSlope(sma150Values),
      calculateSlope(sma200Values)
    );

    return calculateSentimentScore(vixLevel, regime, data.sectors);
  }, [data]);

  if (!client) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-8 text-center text-text-secondary">
        Enter your FMP API key to load market data
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface p-12 text-text-secondary">
        <Loader2 size={18} className="animate-spin" />
        Loading market data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-bearish/30 bg-bg-surface p-8 text-center text-bearish">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Top row: Sentiment Score + Index Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {sentiment && (
          <SentimentScore
            score={sentiment.score}
            label={sentiment.label}
            color={sentiment.color}
            commentary={sentiment.commentary}
          />
        )}
        <div className="flex items-center">
          <IndexBar
            sp500={data.sp500}
            nasdaq={data.nasdaq}
            dowJones={data.dowJones}
            russell={data.russell}
          />
        </div>
      </div>

      {/* Second row: VIX + SPX Trend + Treasury */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <VixGauge vix={data.vix} />
        <SpxTrendCard
          spxHistory={data.spxHistory}
          spxSma50={data.spxSma50}
          spxSma150={data.spxSma150}
          spxSma200={data.spxSma200}
        />
        <TreasuryCard
          treasury={data.treasury}
          treasuryRates={data.treasuryRates}
        />
      </div>

      {/* Third row: Fear & Greed + Sector Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FearGreedGauge />
        <SectorGrid sectors={data.sectors} />
      </div>

      {/* Fourth row: Market Movers + Economic Calendar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MarketMovers
          gainers={data.gainers}
          losers={data.losers}
          actives={data.actives}
        />
        <EconomicCalendar events={data.econCalendar} />
      </div>
    </div>
  );
}
