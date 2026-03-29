"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import TabNavigation, { type Tab } from "@/components/TabNavigation";
import TickerSearch from "@/components/TickerSearch";
import { useFMPClient } from "@/hooks/useFMPClient";
import type { TickerData } from "@/lib/fmp/types";
import MarketDashboard from "@/components/market/MarketDashboard";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [apiKey, setApiKey] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerDataMap, setTickerDataMap] = useState<Record<string, TickerData>>({});
  const [loadingTickers, setLoadingTickers] = useState<Set<string>>(new Set());

  const { client, requestCount, updateRequestCount } = useFMPClient(apiKey);

  const handleAddTicker = useCallback(
    async (ticker: string) => {
      if (!client || tickers.includes(ticker) || tickers.length >= 4) return;

      setTickers((prev) => [...prev, ticker]);
      setLoadingTickers((prev) => new Set(prev).add(ticker));
      setActiveTab("analysis");

      try {
        const data = await client.fetchTickerData(ticker);
        setTickerDataMap((prev) => ({ ...prev, [ticker]: data }));
        updateRequestCount();
      } finally {
        setLoadingTickers((prev) => {
          const next = new Set(prev);
          next.delete(ticker);
          return next;
        });
      }
    },
    [client, tickers, updateRequestCount]
  );

  const handleRemoveTicker = useCallback((ticker: string) => {
    setTickers((prev) => prev.filter((t) => t !== ticker));
    setTickerDataMap((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
  }, []);

  const isLoading = loadingTickers.size > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        requestCount={requestCount}
      />
      <TickerSearch
        tickers={tickers}
        onAddTicker={handleAddTicker}
        onRemoveTicker={handleRemoveTicker}
        loading={isLoading}
      />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 p-4">
        {activeTab === "market" && (
          <MarketDashboard
            client={client}
            onRequestCountUpdate={updateRequestCount}
          />
        )}

        {activeTab === "analysis" && (
          <>
            {tickers.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg-surface p-8 text-center text-text-secondary">
                Enter a ticker in the search bar to begin analysis
              </div>
            ) : loadingTickers.size > 0 && Object.keys(tickerDataMap).length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface p-12 text-text-secondary">
                <Loader2 size={18} className="animate-spin" />
                Loading ticker data...
              </div>
            ) : (
              <AnalysisDashboard
                tickerData={tickers
                  .filter((t) => tickerDataMap[t])
                  .map((t) => tickerDataMap[t])}
              />
            )}
          </>
        )}

        {activeTab === "compare" && (
          <div className="rounded-lg border border-border bg-bg-surface p-8 text-center text-text-secondary">
            {tickers.length < 2
              ? "Add 2+ tickers to compare side by side"
              : `Comparing: ${tickers.join(" vs ")} — coming in Phase 6`}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-4 py-2 text-center text-[10px] text-text-secondary">
        StockTrax — Adam Khoo VMI & Profit Snapper Analysis
      </footer>
    </div>
  );
}
