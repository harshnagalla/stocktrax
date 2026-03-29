"use client";

import type { TickerData } from "@/lib/fmp/types";
import { calculateVMIScore } from "@/lib/vmi-scoring";
import { calculateTradingSignal } from "@/lib/technical-utils";

interface ComparisonTableProps {
  tickerData: TickerData[];
}

function fmt(val: number | null | undefined, type: "price" | "ratio" | "pct" | "cap"): string {
  if (val == null || !isFinite(val)) return "--";
  switch (type) {
    case "price":
      return `$${val.toFixed(2)}`;
    case "ratio":
      return val.toFixed(2);
    case "pct":
      return `${(val * 100).toFixed(1)}%`;
    case "cap": {
      const abs = Math.abs(val);
      if (abs >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
      if (abs >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
      return `$${val.toLocaleString()}`;
    }
  }
}

type RowDef = {
  label: string;
  getValue: (d: TickerData) => string;
  getRaw: (d: TickerData) => number | null;
  higherIsBetter: boolean;
  isSignal?: boolean;
  getColor?: (d: TickerData) => string;
};

export default function ComparisonTable({ tickerData }: ComparisonTableProps) {
  if (tickerData.length < 2) return null;

  const rows: RowDef[] = [
    {
      label: "Company Name",
      getValue: (d) => d.profile?.companyName ?? d.ticker,
      getRaw: () => null,
      higherIsBetter: true,
    },
    {
      label: "Price",
      getValue: (d) => fmt(d.quote?.price, "price"),
      getRaw: (d) => d.quote?.price ?? null,
      higherIsBetter: true,
    },
    {
      label: "Market Cap",
      getValue: (d) => fmt(d.quote?.marketCap, "cap"),
      getRaw: (d) => d.quote?.marketCap ?? null,
      higherIsBetter: true,
    },
    {
      label: "P/E Ratio",
      getValue: (d) => fmt(d.keyMetrics?.peRatioTTM, "ratio"),
      getRaw: (d) => d.keyMetrics?.peRatioTTM ?? null,
      higherIsBetter: false,
    },
    {
      label: "PEG Ratio",
      getValue: (d) => fmt(d.keyMetrics?.pegRatioTTM, "ratio"),
      getRaw: (d) => d.keyMetrics?.pegRatioTTM ?? null,
      higherIsBetter: false,
    },
    {
      label: "ROE",
      getValue: (d) => fmt(d.ratios?.returnOnEquityTTM, "pct"),
      getRaw: (d) => d.ratios?.returnOnEquityTTM ?? null,
      higherIsBetter: true,
    },
    {
      label: "Debt/Equity",
      getValue: (d) => fmt(d.keyMetrics?.debtToEquityTTM, "ratio"),
      getRaw: (d) => d.keyMetrics?.debtToEquityTTM ?? null,
      higherIsBetter: false,
    },
    {
      label: "Operating Margin",
      getValue: (d) => fmt(d.ratios?.operatingProfitMarginTTM, "pct"),
      getRaw: (d) => d.ratios?.operatingProfitMarginTTM ?? null,
      higherIsBetter: true,
    },
    {
      label: "Revenue Growth",
      getValue: (d) => fmt(d.growth?.[0]?.revenueGrowth ?? null, "pct"),
      getRaw: (d) => d.growth?.[0]?.revenueGrowth ?? null,
      higherIsBetter: true,
    },
    {
      label: "VMI Score",
      getValue: (d) => {
        const s = calculateVMIScore(d);
        return `${s.total} (${s.label})`;
      },
      getRaw: (d) => calculateVMIScore(d).total,
      higherIsBetter: true,
      isSignal: true,
      getColor: (d) => calculateVMIScore(d).color,
    },
    {
      label: "Trading Signal",
      getValue: (d) => calculateTradingSignal(d).signal,
      getRaw: () => null,
      higherIsBetter: true,
      isSignal: true,
      getColor: (d) => calculateTradingSignal(d).color,
    },
  ];

  function findBestIndex(row: RowDef): number | null {
    if (row.isSignal && row.label === "Trading Signal") return null;
    if (row.label === "Company Name") return null;

    const rawValues = tickerData.map((d) => row.getRaw(d));
    const validIndices = rawValues
      .map((v, i) => (v != null ? i : -1))
      .filter((i) => i >= 0);
    if (validIndices.length < 2) return null;

    let bestIdx = validIndices[0];
    for (const idx of validIndices) {
      const current = rawValues[idx]!;
      const best = rawValues[bestIdx]!;
      if (row.higherIsBetter ? current > best : current < best) {
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        Side-by-Side Comparison
      </h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 pr-4 text-left font-medium text-text-secondary">
                Metric
              </th>
              {tickerData.map((d) => (
                <th
                  key={d.ticker}
                  className="pb-2 px-3 text-right font-semibold text-text-primary"
                >
                  {d.ticker}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const bestIdx = findBestIndex(row);
              return (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-text-secondary">{row.label}</td>
                  {tickerData.map((d, i) => {
                    const isBest = bestIdx === i;
                    const signalColor = row.getColor?.(d);
                    return (
                      <td
                        key={d.ticker}
                        className={`py-2 px-3 text-right font-medium ${
                          signalColor
                            ? signalColor
                            : isBest
                              ? "text-bullish"
                              : "text-text-primary"
                        }`}
                      >
                        {row.getValue(d)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
