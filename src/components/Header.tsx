"use client";

import { Activity, RotateCw } from "lucide-react";
import ApiKeyInput from "./ApiKeyInput";
import type { ApiProvider } from "@/hooks/useFMPClient";

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  requestCount: number;
  onRefresh?: () => void;
  provider: ApiProvider;
  onProviderChange: (provider: ApiProvider) => void;
}

const PROVIDER_LABELS: Record<ApiProvider, string> = {
  demo: "Demo",
  fmp: "FMP",
  yahoo: "Yahoo",
};

export default function Header({
  apiKey,
  onApiKeyChange,
  requestCount,
  onRefresh,
  provider,
  onProviderChange,
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

        <div className="flex items-center gap-2">
          {/* Provider selector */}
          <div className="flex rounded-lg border border-border bg-bg-surface text-[11px]">
            {(["demo", "fmp", "yahoo"] as ApiProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => onProviderChange(p)}
                className={`px-2 py-1 transition-colors first:rounded-l-md last:rounded-r-md ${
                  provider === p
                    ? "bg-info text-white font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>

          {/* API key input — hidden in demo mode */}
          {provider !== "demo" && (
            <ApiKeyInput
              value={apiKey}
              onChange={onApiKeyChange}
              placeholder={provider === "yahoo" ? "RapidAPI Key" : "FMP API Key"}
            />
          )}

          <button
            onClick={onRefresh}
            className="rounded-full p-1.5 text-text-secondary hover:bg-bg-surface transition-colors"
            title="Refresh data"
          >
            <RotateCw size={14} />
          </button>
          <span className={`text-[11px] whitespace-nowrap ${countColor}`}>
            {requestCount}/{provider === "yahoo" ? "500" : "250"}
          </span>
        </div>
      </div>
    </header>
  );
}
