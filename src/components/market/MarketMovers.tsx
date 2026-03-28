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
  gainers,
  losers,
  actives,
  onTickerClick,
}: MarketMoversProps) {
  const [tab, setTab] = useState<MoverTab>("gainers");

  const tabs: { id: MoverTab; label: string }[] = [
    { id: "gainers", label: "Gainers" },
    { id: "losers", label: "Losers" },
    { id: "actives", label: "Active" },
  ];

  const items =
    tab === "gainers" ? gainers : tab === "losers" ? losers : actives;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? "bg-info/20 text-info"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {items.slice(0, 5).map((m) => {
          const pct = m.changesPercentage ?? 0;
          const positive = pct >= 0;
          return (
            <div
              key={m.symbol}
              className="flex items-center justify-between text-xs"
            >
              <button
                onClick={() => onTickerClick?.(m.symbol)}
                className="font-bold text-info hover:underline"
              >
                {m.symbol}
              </button>
              <span className="flex-1 truncate px-2 text-[10px] text-text-secondary">
                {m.name}
              </span>
              <span className="text-text-primary">
                ${m.price?.toFixed(2) ?? "--"}
              </span>
              <span
                className={`ml-2 w-16 text-right ${positive ? "text-bullish" : "text-bearish"}`}
              >
                {positive ? "+" : ""}
                {pct.toFixed(2)}%
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
