"use client";

import { useState } from "react";
import { Search, X, Loader2, Plus } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const atMax = tickers.length >= 4;
  const ticker = input.trim().toUpperCase();
  const canAdd = !!ticker && !atMax && !tickers.includes(ticker);

  function handleSubmit() {
    if (atMax) {
      setError("Remove a ticker before adding another.");
      return;
    }
    if (!ticker) return;
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) {
      setError("Enter a valid ticker.");
      return;
    }
    if (tickers.includes(ticker)) {
      setError(`${ticker} is already open.`);
      return;
    }
    onAddTicker(ticker);
    setInput("");
    setError(null);
  }

  return (
    <div className="border-b border-border bg-white px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <div className="relative flex min-w-0 flex-1 items-center">
          {loading ? (
            <Loader2 size={14} className="absolute left-3 animate-spin text-info" />
          ) : (
            <Search size={14} className="absolute left-3 text-text-secondary" />
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={atMax ? "Max 4 tickers" : "Add ticker..."}
            disabled={atMax}
            className="w-full rounded-full border border-border bg-bg-surface py-2 pl-9 pr-10 text-sm font-medium text-text-primary transition-all placeholder:text-text-secondary focus:border-info focus:bg-white focus:outline-none focus:ring-2 focus:ring-info/10 disabled:opacity-50"
          />
          {input && (
            <button
              onClick={() => {
                setInput("");
                setError(null);
              }}
              className="absolute right-2 rounded-full p-1 text-text-secondary hover:bg-border hover:text-text-primary"
              title="Clear"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canAdd}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info text-white shadow-sm shadow-info/25 transition-all active:scale-[0.97] disabled:bg-border disabled:text-text-secondary disabled:shadow-none"
          title="Add ticker"
        >
          <Plus size={16} />
        </button>
      </div>

      {(tickers.length > 0 || error) && (
        <div className="mx-auto mt-2 flex max-w-4xl items-center gap-2">
          {tickers.length > 0 && (
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              {tickers.map((t) => (
                <span
                  key={t}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-info/10 px-2.5 py-1 text-xs font-semibold text-info"
                >
                  {t}
                  <button
                    onClick={() => onRemoveTicker(t)}
                    className="rounded-full p-0.5 transition-colors hover:bg-info/20"
                    title={`Remove ${t}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {error && <div className="shrink-0 text-[11px] font-medium text-bearish">{error}</div>}
        </div>
      )}
    </div>
  );
}
