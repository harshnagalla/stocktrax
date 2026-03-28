"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TabNavigation, { type Tab } from "@/components/TabNavigation";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [apiKey, setApiKey] = useState("");
  const [tickers] = useState<string[]>([]);

  const requestCount = 0; // Placeholder — wired to FMP client in Plan 01-03

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        requestCount={requestCount}
      />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 p-4">
        {activeTab === "market" && (
          <div className="rounded-lg border border-border bg-bg-surface p-8 text-center text-text-secondary">
            Market Sentiment Dashboard — coming in Phase 2
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="rounded-lg border border-border bg-bg-surface p-8 text-center text-text-secondary">
            {tickers.length === 0
              ? "Enter a ticker in the search bar to begin analysis"
              : `Analyzing: ${tickers.join(", ")}`}
          </div>
        )}

        {activeTab === "compare" && (
          <div className="rounded-lg border border-border bg-bg-surface p-8 text-center text-text-secondary">
            {tickers.length < 2
              ? "Add 2+ tickers to compare side by side"
              : `Comparing: ${tickers.join(" vs ")}`}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-4 py-2 text-center text-[10px] text-text-secondary">
        StockTrax — Adam Khoo VMI & Profit Snapper Analysis
      </footer>
    </div>
  );
}
