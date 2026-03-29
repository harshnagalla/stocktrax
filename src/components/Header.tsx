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

const PROVIDERS: { id: ApiProvider; label: string }[] = [
  { id: "yahoo-free", label: "Yahoo" },
  { id: "demo", label: "Demo" },
  { id: "fmp", label: "FMP" },
  { id: "yahoo", label: "RapidAPI" },
];

const NEEDS_KEY: ApiProvider[] = ["fmp", "yahoo"];

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

  const needsKey = NEEDS_KEY.includes(provider);

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
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => onProviderChange(p.id)}
                className={`px-2 py-1 transition-colors first:rounded-l-md last:rounded-r-md ${
                  provider === p.id
                    ? "bg-info text-white font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* API key input — only for providers that need one */}
          {needsKey && (
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
            {requestCount}
          </span>
        </div>
      </div>
    </header>
  );
}
