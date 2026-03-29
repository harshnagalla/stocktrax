"use client";

import type { TickerData } from "@/lib/fmp/types";
import { calculateTradingSignal } from "@/lib/technical-utils";

interface TradingSignalCardProps {
  data: TickerData;
}

const signalBg: Record<string, string> = {
  "Strong Buy": "bg-bullish text-white",
  Buy: "bg-bullish/80 text-white",
  Watch: "bg-neutral text-white",
  Neutral: "bg-border text-text-primary",
  Avoid: "bg-bearish text-white",
};

export default function TradingSignalCard({ data }: TradingSignalCardProps) {
  const { signal, reasons } = calculateTradingSignal(data);

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        Trading Signal
      </h3>

      <div className="mt-3">
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${signalBg[signal] ?? "bg-border text-text-primary"}`}
        >
          {signal}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {reasons.map((reason, i) => (
          <li key={i} className="text-xs text-text-secondary">
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
