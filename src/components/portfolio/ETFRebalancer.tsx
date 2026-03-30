"use client";

import { useState } from "react";
import { ArrowRightLeft, DollarSign } from "lucide-react";

interface ETFRebalancerProps {
  quotes: Record<string, { price: number; name?: string }>;
}

interface Allocation {
  ticker: string;
  targetPct: number;
}

const DEFAULT_ALLOCATIONS: Allocation[] = [
  { ticker: "VOO", targetPct: 50 },
  { ticker: "QQQ", targetPct: 30 },
  { ticker: "VTWO", targetPct: 20 },
];

export default function ETFRebalancer({ quotes }: ETFRebalancerProps) {
  const [amount, setAmount] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>(DEFAULT_ALLOCATIONS);

  const total = parseFloat(amount) || 0;
  const totalPct = allocations.reduce((s, a) => s + a.targetPct, 0);

  function updateAllocation(index: number, pct: number) {
    setAllocations((prev) => prev.map((a, i) => (i === index ? { ...a, targetPct: pct } : a)));
  }

  function addTicker(ticker: string) {
    if (allocations.find((a) => a.ticker === ticker)) return;
    setAllocations((prev) => [...prev, { ticker: ticker.toUpperCase(), targetPct: 0 }]);
  }

  function removeTicker(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ArrowRightLeft size={14} className="text-info" />
        ETF Rebalancer
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        Enter amount to invest and see how to split across ETFs
      </p>

      {/* Amount input */}
      <div className="mt-3 relative">
        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="number"
          placeholder="Amount to invest"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-8 pr-3 text-sm focus:border-info focus:outline-none"
        />
      </div>

      {/* Allocation sliders */}
      <div className="mt-4 space-y-3">
        {allocations.map((alloc, i) => {
          const price = quotes[alloc.ticker]?.price ?? 0;
          const dollarAmount = total * (alloc.targetPct / 100);
          const shares = price > 0 ? Math.floor(dollarAmount / price) : 0;

          return (
            <div key={alloc.ticker} className="rounded-xl bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{alloc.ticker}</span>
                  <button onClick={() => removeTicker(i)} className="text-[10px] text-text-secondary hover:text-bearish">✕</button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={alloc.targetPct}
                    onChange={(e) => updateAllocation(i, parseFloat(e.target.value) || 0)}
                    className="w-14 rounded border border-border px-2 py-1 text-right text-xs"
                  />
                  <span className="text-xs text-text-secondary">%</span>
                </div>
              </div>

              {total > 0 && (
                <div className="mt-2 flex justify-between text-xs text-text-secondary">
                  <span>${dollarAmount.toFixed(2)}</span>
                  <span>{shares} shares @ ${price.toFixed(2)}</span>
                </div>
              )}

              {/* Visual bar */}
              <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-info" style={{ width: `${Math.min(alloc.targetPct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total check */}
      <div className={`mt-3 text-xs font-bold ${totalPct === 100 ? "text-bullish" : "text-bearish"}`}>
        Total: {totalPct}% {totalPct !== 100 && `(should be 100%)`}
      </div>

      {/* Add ticker */}
      <div className="mt-2">
        <input
          placeholder="Add ticker..."
          className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-xs focus:border-info focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTicker((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      </div>

      {/* Summary */}
      {total > 0 && totalPct === 100 && (
        <div className="mt-3 rounded-xl bg-bullish/5 p-3">
          <div className="text-xs font-bold text-bullish">Buy Order Summary</div>
          <div className="mt-1 space-y-1 text-xs">
            {allocations.filter((a) => a.targetPct > 0).map((alloc) => {
              const price = quotes[alloc.ticker]?.price ?? 0;
              const dollarAmount = total * (alloc.targetPct / 100);
              const shares = price > 0 ? Math.floor(dollarAmount / price) : 0;
              return (
                <div key={alloc.ticker} className="flex justify-between">
                  <span className="font-bold">{alloc.ticker}</span>
                  <span>{shares} shares (${(shares * price).toFixed(2)})</span>
                </div>
              );
            })}
            <div className="border-t border-border pt-1 flex justify-between font-bold">
              <span>Remaining cash</span>
              <span>${(total - allocations.reduce((s, a) => {
                const price = quotes[a.ticker]?.price ?? 0;
                const shares = price > 0 ? Math.floor((total * a.targetPct / 100) / price) : 0;
                return s + shares * price;
              }, 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
