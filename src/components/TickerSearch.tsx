"use client";

import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface TickerSearchProps {
  tickers: string[];
  onAddTicker: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  loading: boolean;
}

export default function TickerSearch({
  tickers,
  onAddTicker,
  onRemoveTicker,
  loading,
}: TickerSearchProps) {
  const [input, setInput] = useState("");
  const atMax = tickers.length >= 4;

  function handleSubmit() {
    const ticker = input.trim().toUpperCase();
    if (!ticker || atMax || tickers.includes(ticker)) return;
    onAddTicker(ticker);
    setInput("");
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-white px-4 py-2.5">
      <div className="relative flex items-center flex-1 min-w-0">
        {loading ? (
          <Loader2 size={14} className="absolute left-3 animate-spin text-info" />
        ) : (
          <Search size={14} className="absolute left-3 text-text-secondary" />
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={atMax ? "Max 4 tickers" : "Search ticker..."}
          disabled={atMax}
          className="w-full rounded-full border border-border bg-bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:border-info focus:outline-none focus:ring-2 focus:ring-info/10 disabled:opacity-50 transition-all"
        />
      </div>

      {tickers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {tickers.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2.5 py-1 text-xs font-semibold text-info"
            >
              {t}
              <button
                onClick={() => onRemoveTicker(t)}
                className="rounded-full p-0.5 hover:bg-info/20 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
