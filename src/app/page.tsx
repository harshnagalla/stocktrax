"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import TabNavigation, { type Tab } from "@/components/TabNavigation";
import TickerSearch from "@/components/TickerSearch";
import { getQuotes, getHistory, type StockQuote, type HistoricalPrice } from "@/lib/data-service";
import MarketDashboard from "@/components/market/MarketDashboard";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";
import PortfolioDashboard from "@/components/portfolio/PortfolioDashboard";
import ScreenerDashboard from "@/components/screener/ScreenerDashboard";
import { Loader2, Search } from "lucide-react";

export interface TickerAnalysis {
  quote: StockQuote;
  history: HistoricalPrice[];
}

export default function Home() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerDataMap, setTickerDataMap] = useState<Record<string, TickerAnalysis>>({});
  const [loadingTickers, setLoadingTickers] = useState<Set<string>>(new Set());

  const handleAddTicker = useCallback(
    async (ticker: string) => {
      if (tickers.includes(ticker) || tickers.length >= 4) return;
      setTickers((prev) => [...prev, ticker]);
      setLoadingTickers((prev) => new Set(prev).add(ticker));
      setActiveTab("analysis");
      try {
        const [quotes, history] = await Promise.all([getQuotes([ticker]), getHistory(ticker)]);
        const quote = quotes[ticker];
        if (quote) setTickerDataMap((prev) => ({ ...prev, [ticker]: { quote, history } }));
      } finally {
        setLoadingTickers((prev) => { const n = new Set(prev); n.delete(ticker); return n; });
      }
    },
    [tickers]
  );

  const handleRemoveTicker = useCallback((ticker: string) => {
    setTickers((prev) => prev.filter((t) => t !== ticker));
    setTickerDataMap((prev) => { const n = { ...prev }; delete n[ticker]; return n; });
  }, []);

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={24} className="animate-spin text-info" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginScreen onSignIn={signInWithGoogle} />;
  }

  const isLoading = loadingTickers.size > 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header user={user} onSignOut={signOut} />
      <TickerSearch
        tickers={tickers}
        onAddTicker={handleAddTicker}
        onRemoveTicker={handleRemoveTicker}
        loading={isLoading}
      />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-20 sm:max-w-2xl sm:pb-4 lg:max-w-4xl">
        {activeTab === "market" && <MarketDashboard />}

        {activeTab === "screener" && <ScreenerDashboard />}

        {activeTab === "analysis" && (
          <>
            {tickers.length === 0 ? (
              <div className="rounded-2xl bg-bg-surface p-10 text-center">
                <Search size={32} className="mx-auto text-text-secondary/50" />
                <div className="mt-3 text-base font-semibold">Analyze a Stock</div>
                <div className="mt-1 text-sm text-text-secondary">
                  Type a ticker above to get a full analysis with plain English explanations
                </div>
              </div>
            ) : loadingTickers.size > 0 && Object.keys(tickerDataMap).length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <AnalysisDashboard
                tickerData={tickers.filter((t) => tickerDataMap[t]).map((t) => tickerDataMap[t])}
              />
            )}
          </>
        )}

        {activeTab === "portfolio" && <PortfolioDashboard userId={user.uid} />}
      </main>
    </div>
  );
}
