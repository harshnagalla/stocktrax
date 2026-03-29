"use client";

import { useEffect, useState } from "react";
import type { FMPClient } from "@/lib/fmp/client";
import type { FMPQuote } from "@/lib/fmp/types";
import { HOLDINGS, UNIQUE_TICKERS, type Holding } from "./holdings";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioDashboardProps {
  client: FMPClient;
  onRequestCountUpdate: () => void;
  onTickerClick?: (ticker: string) => void;
}

interface EnrichedHolding extends Holding {
  currentPrice: number | null;
  changePct: number | null;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

export default function PortfolioDashboard({
  client,
  onRequestCountUpdate,
  onTickerClick,
}: PortfolioDashboardProps) {
  const [quotes, setQuotes] = useState<Record<string, FMPQuote>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    client
      .fetchBatchQuotes(UNIQUE_TICKERS)
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, FMPQuote> = {};
        for (const q of data) {
          map[q.symbol] = q;
        }
        setQuotes(map);
        onRequestCountUpdate();
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [client, onRequestCountUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading portfolio...</span>
      </div>
    );
  }

  // Enrich holdings with current prices
  const enriched: EnrichedHolding[] = HOLDINGS.map((h) => {
    const q = quotes[h.ticker];
    const currentPrice = q?.price ?? null;
    const changePct = q?.changesPercentage ?? null;
    const marketValue = currentPrice ? currentPrice * h.shares : h.avgCost * h.shares;
    const costBasis = h.avgCost * h.shares;
    const pnl = marketValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return { ...h, currentPrice, changePct, marketValue, pnl, pnlPct };
  });

  // Group by account
  const tiger = enriched.filter((h) => h.account === "Tiger");
  const ibkr = enriched.filter((h) => h.account === "IBKR");

  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = enriched.reduce((s, h) => s + h.avgCost * h.shares, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalPositive = totalPnl >= 0;

  // Find biggest winners and losers
  const sorted = [...enriched].sort((a, b) => b.pnlPct - a.pnlPct);
  const winners = sorted.filter((h) => h.pnl > 0).slice(0, 3);
  const losers = sorted.filter((h) => h.pnl < 0).slice(-3).reverse();

  return (
    <div className="space-y-3">
      {/* Portfolio Summary */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="text-xs font-medium text-text-secondary">Total Portfolio</div>
        <div className="mt-1 text-3xl font-bold">
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${totalPositive ? "text-bullish" : "text-bearish"}`}>
          {totalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {totalPositive ? "+" : ""}${totalPnl.toFixed(2)} ({totalPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%)
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          Cost basis: ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-bullish/5 p-4">
          <div className="text-xs font-medium text-text-secondary">Top Winners</div>
          <div className="mt-2 space-y-1.5">
            {winners.map((h) => (
              <button
                key={`${h.account}-${h.ticker}`}
                onClick={() => onTickerClick?.(h.ticker)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-info">{h.ticker}</span>
                <span className="text-xs font-semibold text-bullish">+{h.pnlPct.toFixed(1)}%</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-bearish/5 p-4">
          <div className="text-xs font-medium text-text-secondary">Biggest Losers</div>
          <div className="mt-2 space-y-1.5">
            {losers.map((h) => (
              <button
                key={`${h.account}-${h.ticker}`}
                onClick={() => onTickerClick?.(h.ticker)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-info">{h.ticker}</span>
                <span className="text-xs font-semibold text-bearish">{h.pnlPct.toFixed(1)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings by Account */}
      {[{ name: "Tiger Brokers", holdings: tiger }, { name: "IBKR", holdings: ibkr }].map((account) => (
        <div key={account.name} className="rounded-2xl bg-bg-surface p-5">
          <div className="mb-3 text-sm font-semibold">{account.name}</div>
          <div className="space-y-2">
            {account.holdings.map((h) => {
              const positive = h.pnl >= 0;
              return (
                <button
                  key={`${h.account}-${h.ticker}`}
                  onClick={() => onTickerClick?.(h.ticker)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white active:bg-white"
                >
                  <div>
                    <div className="text-sm font-bold">{h.ticker}</div>
                    <div className="text-[10px] text-text-secondary">
                      {h.shares} shares @ ${h.avgCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${h.currentPrice?.toFixed(2) ?? "--"}
                    </div>
                    <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                      {positive ? "+" : ""}{h.pnlPct.toFixed(1)}%
                      <span className="ml-1 text-[10px]">
                        ({positive ? "+" : ""}${h.pnl.toFixed(0)})
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
