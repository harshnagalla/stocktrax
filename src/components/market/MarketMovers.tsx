"use client";

import { useState } from "react";
import type { FMPMarketMover } from "@/lib/fmp/types";

type MoverTab = "gainers" | "losers" | "actives";

interface MarketMoversProps {
  gainers: FMPMarketMover[];
  losers: FMPMarketMover[];
  actives: FMPMarketMover[];
  onTickerClick?: (ticker: string) => void;
}

export default function MarketMovers({
  gainers, losers, actives, onTickerClick,
}: MarketMoversProps) {
  const [tab, setTab] = useState<MoverTab>("gainers");

  const tabs: { id: MoverTab; label: string }[] = [
    { id: "gainers", label: "Gainers" },
    { id: "losers", label: "Losers" },
    { id: "actives", label: "Active" },
  ];

  const items = tab === "gainers" ? gainers : tab === "losers" ? losers : actives;

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="mb-3 flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-text-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.slice(0, 5).map((m) => {
          const pct = m.changesPercentage ?? 0;
          const positive = pct >= 0;
          return (
            <div key={m.symbol} className="flex items-center justify-between">
              <button
                onClick={() => onTickerClick?.(m.symbol)}
                className="text-sm font-bold text-info hover:underline"
              >
                {m.symbol}
              </button>
              <span className="flex-1 truncate px-2 text-xs text-text-secondary">
                {m.name}
              </span>
              <span className={`text-sm font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                {positive ? "+" : ""}{pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-xs text-text-secondary">No data</div>
        )}
      </div>
    </div>
  );
}
