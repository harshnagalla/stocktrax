"use client";

import type { TickerAnalysis } from "@/app/page";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockHeaderProps {
  data: TickerAnalysis;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export default function StockHeader({ data }: StockHeaderProps) {
  const { quote } = data;
  const positive = quote.change >= 0;
  const changeColor = positive ? "text-bullish" : "text-bearish";
  const ChangeIcon = positive ? TrendingUp : TrendingDown;

  const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const pricePosition = range > 0 ? ((quote.price - quote.fiftyTwoWeekLow) / range) * 100 : 50;

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{quote.symbol}</span>
            {quote.sector && (
              <span className="rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                {quote.sector}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">{quote.name}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">${quote.price.toFixed(2)}</div>
          <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${changeColor}`}>
            <ChangeIcon size={14} />
            {positive ? "+" : ""}{quote.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-text-secondary">
        <span>Mkt Cap <strong className="text-text-primary">{formatMarketCap(quote.marketCap)}</strong></span>
        {quote.pe != null && <span>P/E <strong className="text-text-primary">{quote.pe.toFixed(1)}</strong></span>}
        {quote.beta != null && <span>Beta <strong className="text-text-primary">{quote.beta.toFixed(2)}</strong></span>}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-text-secondary">
          <span>${quote.fiftyTwoWeekLow.toFixed(2)}</span>
          <span>52W Range</span>
          <span>${quote.fiftyTwoWeekHigh.toFixed(2)}</span>
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
