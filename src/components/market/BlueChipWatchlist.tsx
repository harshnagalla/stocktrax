"use client";

const BLUE_CHIPS = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "GOOG", name: "Alphabet" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "NVDA", name: "Nvidia" },
  { ticker: "META", name: "Meta" },
  { ticker: "BRK-B", name: "Berkshire" },
  { ticker: "UNH", name: "UnitedHealth" },
  { ticker: "V", name: "Visa" },
  { ticker: "MA", name: "Mastercard" },
];

interface BlueChipWatchlistProps {
  onTickerClick?: (ticker: string) => void;
}

export default function BlueChipWatchlist({ onTickerClick }: BlueChipWatchlistProps) {
  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="text-sm font-semibold">Blue Chip Watchlist</div>
      <div className="mt-1 mb-4 text-xs text-text-secondary">
        Strong moat stocks — tap to analyze
      </div>

      <div className="space-y-3">
        {BLUE_CHIPS.map((s) => (
          <button
            key={s.ticker}
            onClick={() => onTickerClick?.(s.ticker)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white active:bg-white"
          >
            <span className="text-sm font-bold text-info">{s.ticker}</span>
            <span className="text-xs text-text-secondary">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
