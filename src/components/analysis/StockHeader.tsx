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
    <div className="rounded-2xl bg-bg-surface p-5">
      {/* Top: ticker + price */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{data.ticker}</span>
            {profile?.sector && (
              <span className="rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                {profile.sector}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {profile?.companyName ?? ""}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">${price?.toFixed(2) ?? "--"}</div>
          {change != null && changePct != null && (
            <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${changeColor}`}>
              <ChangeIcon size={14} />
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex gap-4 text-xs text-text-secondary">
        <span>Mkt Cap <strong className="text-text-primary">{formatMarketCap(quote?.marketCap)}</strong></span>
        {profile?.beta != null && (
          <span>Beta <strong className="text-text-primary">{profile.beta.toFixed(2)}</strong></span>
        )}
      </div>

      {/* 52-week range */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-text-secondary">
          <span>${yearLow.toFixed(2)}</span>
          <span className="text-[10px]">52W Range</span>
          <span>${yearHigh.toFixed(2)}</span>
        </div>
        <div className="relative mt-1 h-1.5 rounded-full bg-border">
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info ring-2 ring-white"
            style={{ left: `${Math.min(Math.max(pricePosition, 3), 97)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
