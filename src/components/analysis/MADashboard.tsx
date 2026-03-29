"use client";

import type { TickerData } from "@/lib/fmp/types";
import { getMAData } from "@/lib/technical-utils";
import { getSlopeArrow } from "@/lib/market-utils";

interface MADashboardProps {
  data: TickerData;
}

const slopeColor: Record<"up" | "down" | "flat", string> = {
  up: "text-bullish",
  down: "text-bearish",
  flat: "text-neutral",
};

export default function MADashboard({ data }: MADashboardProps) {
  const mas = getMAData(data);

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        Moving Averages
      </h3>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-secondary">
              <th className="pb-2 text-left font-medium">Indicator</th>
              <th className="pb-2 text-right font-medium">Value</th>
              <th className="pb-2 text-center font-medium">Slope</th>
              <th className="pb-2 text-right font-medium">Price vs MA</th>
            </tr>
          </thead>
          <tbody>
            {mas.map((ma) => (
              <tr key={ma.label} className="border-b border-border/50">
                <td className="py-2 text-text-primary font-medium">
                  {ma.label}
                </td>
                <td className="py-2 text-right text-text-primary">
                  {ma.value != null ? `$${ma.value.toFixed(2)}` : "--"}
                </td>
                <td
                  className={`py-2 text-center font-semibold ${slopeColor[ma.slopeDir]}`}
                >
                  {getSlopeArrow(ma.slope)}{" "}
                  <span className="text-xs">
                    {ma.slope !== 0 ? `${ma.slope.toFixed(1)}%` : ""}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {ma.value != null ? (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ma.priceAbove
                          ? "bg-bullish/10 text-bullish"
                          : "bg-bearish/10 text-bearish"
                      }`}
                    >
                      {ma.priceAbove ? "Above" : "Below"}
                    </span>
                  ) : (
                    "--"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
