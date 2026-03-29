"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import TabNavigation, { type Tab } from "@/components/TabNavigation";
import TickerSearch from "@/components/TickerSearch";
import { useFMPClient } from "@/hooks/useFMPClient";
import type { TickerData } from "@/lib/fmp/types";
import MarketDashboard from "@/components/market/MarketDashboard";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";
import PortfolioDashboard from "@/components/portfolio/PortfolioDashboard";
import { Loader2, Search } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [apiKey, setApiKey] = useState(
    process.env.NEXT_PUBLIC_FMP_API_KEY ?? ""
  );
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
    <div className="flex min-h-screen flex-col bg-white">
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

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 sm:max-w-2xl lg:max-w-4xl">
        {activeTab === "market" && (
          <MarketDashboard
            client={client}
            onRequestCountUpdate={updateRequestCount}
            onTickerClick={handleAddTicker}
          />
        )}

        {activeTab === "analysis" && (
          <>
            {tickers.length === 0 ? (
              <div className="rounded-2xl bg-bg-surface p-10 text-center">
                <Search size={32} className="mx-auto text-text-secondary/50" />
                <div className="mt-3 text-base font-semibold">Analyze a Stock</div>
                <div className="mt-1 text-sm text-text-secondary">
                  Type a ticker above (e.g. AAPL, MSFT) to get a full
                  Adam Khoo VMI analysis with plain English explanations
                </div>
              </div>
            ) : loadingTickers.size > 0 && Object.keys(tickerDataMap).length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading ticker data...</span>
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

        {activeTab === "portfolio" && (
          <PortfolioDashboard
            client={client}
            onRequestCountUpdate={updateRequestCount}
            onTickerClick={handleAddTicker}
          />
        )}
      </main>
    </div>
  );
}
