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
        : "text-text-secondary";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-info" />
          <span className="text-base font-semibold text-text-primary">
            StockTrax
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ApiKeyInput value={apiKey} onChange={onApiKeyChange} />
          <button
            onClick={onRefresh}
            className="rounded-full p-1.5 text-text-secondary hover:bg-bg-surface transition-colors"
            title="Refresh data"
          >
            <RotateCw size={14} />
          </button>
          <span className={`text-[11px] whitespace-nowrap ${countColor}`}>
            {requestCount}/250
          </span>
        </div>
      </div>
    </header>
  );
}
