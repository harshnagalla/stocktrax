"use client";

import type { TickerData } from "@/lib/fmp/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockHeaderProps {
  data: TickerData;
}

function formatMarketCap(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function StockHeader({ data }: StockHeaderProps) {
  const { profile, quote } = data;
  const price = quote?.price;
  const change = quote?.change;
  const changePct = quote?.changesPercentage;
  const positive = (change ?? 0) >= 0;
  const changeColor = positive ? "text-bullish" : "text-bearish";
  const ChangeIcon = positive ? TrendingUp : TrendingDown;

  const yearLow = quote?.yearLow ?? 0;
  const yearHigh = quote?.yearHigh ?? 0;
  const range = yearHigh - yearLow;
  const pricePosition =
    range > 0 && price != null ? ((price - yearLow) / range) * 100 : 50;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      {/* Top row: ticker info + price + market cap */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Left: ticker, name, sector, beta */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-text-primary">
              {data.ticker}
            </span>
            {profile?.sector && (
              <span className="rounded bg-info/20 px-1.5 py-0.5 text-[10px] font-medium text-info">
                {profile.sector}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {profile?.companyName ?? ""}
          </div>
          {profile?.beta != null && (
            <div className="mt-1 text-[10px] text-text-secondary">
              Beta: {profile.beta.toFixed(2)}
            </div>
          )}
        </div>

        {/* Center: price + change */}
        <div className="text-right">
          <div className="text-2xl font-bold text-text-primary">
            ${price?.toFixed(2) ?? "--"}
          </div>
          {change != null && changePct != null && (
            <div className={`flex items-center justify-end gap-1 text-sm ${changeColor}`}>
              <ChangeIcon size={14} />
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)} ({changePct >= 0 ? "+" : ""}
              {changePct.toFixed(2)}%)
            </div>
          )}
        </div>

        {/* Right: market cap + volume */}
        <div className="text-right text-xs">
          <div>
            <span className="text-text-secondary">Mkt Cap </span>
            <span className="font-medium text-text-primary">
              {formatMarketCap(quote?.marketCap)}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-text-secondary">Vol </span>
            <span className="font-medium text-text-primary">
              {formatVolume(quote?.volume)}
            </span>
          </div>
        </div>
      </div>

      {/* 52-week range bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-text-secondary">
          <span>52W Low: ${yearLow.toFixed(2)}</span>
          <span>52W High: ${yearHigh.toFixed(2)}</span>
        </div>
        <div className="relative mt-1 h-2 rounded-full bg-bg-primary">
          {/* Gradient bar */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-bearish/40 via-neutral/40 to-bullish/40" />
          {/* Current price indicator */}
          <div
            className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-text-primary shadow-sm shadow-text-primary/50"
            style={{ left: `${Math.min(Math.max(pricePosition, 2), 98)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
