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
    <div className="flex items-center gap-2 border-b border-border bg-bg-surface px-4 py-1.5">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-2 text-text-secondary" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={atMax ? "Max 4 tickers" : "Add ticker..."}
          disabled={atMax}
          className="w-32 rounded border border-border bg-bg-primary py-1 pl-7 pr-2 text-xs text-text-primary placeholder:text-text-secondary focus:border-info focus:outline-none disabled:opacity-50"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-2 animate-spin text-info"
          />
        )}
      </div>

      {tickers.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded bg-info/20 px-2 py-0.5 text-[10px] font-bold text-info"
        >
          {t}
          <button
            onClick={() => onRemoveTicker(t)}
            className="rounded-full hover:bg-info/30"
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  );
}
