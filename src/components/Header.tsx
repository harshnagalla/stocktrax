"use client";

import { Activity, RotateCw } from "lucide-react";
import ApiKeyInput from "./ApiKeyInput";

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  requestCount: number;
  onRefresh?: () => void;
}

export default function Header({
  apiKey,
  onApiKeyChange,
  requestCount,
  onRefresh,
}: HeaderProps) {
  const countColor =
    requestCount > 240
      ? "text-bearish"
      : requestCount > 200
        ? "text-neutral"
        : "text-bullish";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg-surface px-4 py-2">
      <div className="flex items-center gap-2">
        <Activity size={20} className="text-bullish" />
        <span className="text-sm font-bold tracking-wide text-text-primary">
          StockTrax
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ApiKeyInput value={apiKey} onChange={onApiKeyChange} />
        <button
          onClick={onRefresh}
          className="rounded p-1 text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors"
          title="Refresh data"
        >
          <RotateCw size={14} />
        </button>
        <span className={`text-[10px] font-mono whitespace-nowrap ${countColor}`}>
          API: {requestCount} / 250
        </span>
      </div>
    </header>
  );
}
