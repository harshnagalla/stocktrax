"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Loader2, TrendingUp, TrendingDown, Shield, ArrowRight,
  Plus, Upload, X, Camera, ArrowRightLeft,
} from "lucide-react";
import ETFRebalancer from "./ETFRebalancer";
import { authFetch } from "@/lib/api-client";

interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  account: string;
}

interface QuoteData {
  price: number;
  changePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  sma50: number;
  sma150: number;
  rsi: number;
  signal: string;
  buyAt: number | null;
  name: string;
}

interface AiData {
  action: string;
  technicalScore: number;
  fundamentalScore: number;
  moatScore: number;
  targetUpside: number;
  intrinsicValue: number | null;
  buyAtPrice: number | null;
  analysis: string;
}

interface EnrichedHolding extends Holding {
  quote: QuoteData | null;
  ai: AiData | null;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

const ETF_TICKERS = new Set(["QQQ", "VOO", "VTWO", "XLV", "IBIT", "CWEB", "SPY", "IWM", "DIA", "VTI", "SCHD", "ARKK", "EEM", "GLD", "TLT", "HYG", "LQD", "BND", "VEA", "VWO"]);

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish" },
  HOLD: { bg: "bg-info/10", text: "text-info" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish" },
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="w-5 text-right text-[10px] font-bold">{score}</span>
    </div>
  );
}

function MoatDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-1.5 w-3 rounded-full ${i <= score ? "bg-bullish" : "bg-border"}`} />
      ))}
    </div>
  );
}

export default function PortfolioDashboard({ userId, email }: { userId: string; email?: string }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [aiData, setAiData] = useState<Record<string, AiData>>({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRebalancer, setShowRebalancer] = useState(false);
  const [importing, setImporting] = useState(false);
  const [addForm, setAddForm] = useState({ ticker: "", shares: "", avgCost: "", account: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  // Load user portfolio from Firestore (auto-seed for harshnagalla@gmail.com)
  useEffect(() => {
    async function load() {
      // Try seed first (only works for harshnagalla@gmail.com, only if empty)
      if (email) {
        await authFetch("/api/seed-portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, email }),
        }).catch(() => {});
      }

      const res = await authFetch('/api/user-portfolio');
      const data = await res.json();
      if (data.holdings?.length > 0) setHoldings(data.holdings);
      setLoading(false);
    }
    load();
  }, [userId, email]);

  // Fetch quotes when holdings change
  useEffect(() => {
    if (holdings.length === 0) return;
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    fetch(`/api/quotes?symbols=${tickers.join(",")}&analyze=true`)
      .then((r) => r.json())
      .then(setQuotes)
      .catch(() => {});
  }, [holdings]);

  // Fetch AI analysis when holdings change
  useEffect(() => {
    if (holdings.length === 0) return;
    setAiLoading(true);
    fetch("/api/portfolio-analysis")
      .then((r) => r.ok ? r.json() : {})
      .then((data) => { if (data && !(data as Record<string, unknown>).error) setAiData(data); })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [holdings]);

  // Save holdings to Firestore
  const saveHoldings = useCallback(async (newHoldings: Holding[]) => {
    setHoldings(newHoldings);
    await authFetch("/api/user-portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings: newHoldings }),
    });
  }, [userId]);

  // Add single holding
  const handleAdd = async () => {
    const ticker = addForm.ticker.toUpperCase().trim();
    if (!ticker || !addForm.shares) return;
    const newHolding: Holding = {
      ticker,
      shares: parseFloat(addForm.shares),
      avgCost: parseFloat(addForm.avgCost) || 0,
      account: addForm.account || "Default",
    };
    await saveHoldings([...holdings, newHolding]);
    setAddForm({ ticker: "", shares: "", avgCost: "", account: "" });
    setShowAdd(false);
  };

  // Remove holding
  const handleRemove = async (index: number) => {
    const newHoldings = holdings.filter((_, i) => i !== index);
    await saveHoldings(newHoldings);
  };

  // Import from screenshot
  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const res = await authFetch("/api/parse-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.holdings?.length > 0) {
          await saveHoldings([...holdings, ...data.holdings]);
        }
      }
    } catch {
      // Import failed
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-12 text-text-secondary">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading portfolio...</span>
      </div>
    );
  }

  // Empty state
  if (holdings.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-bg-surface p-8 text-center">
          <div className="text-base font-semibold">Add Your Portfolio</div>
          <p className="mt-1 text-sm text-text-secondary">
            Add stocks manually or import from a screenshot
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-info/10 px-4 py-2.5 text-sm font-medium text-info"
            >
              <Plus size={16} /> Add Stock
            </button>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary border border-border">
              <Camera size={16} /> Import Screenshot
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
              />
            </label>
          </div>
        </div>
        {showAdd && renderAddForm()}
      </div>
    );
  }

  // Enrich holdings
  const enriched: EnrichedHolding[] = holdings.map((h) => {
    const quote = (quotes[h.ticker] as QuoteData) ?? null;
    const ai = (aiData[h.ticker] as AiData) ?? null;
    const currentPrice = quote?.price ?? null;
    const marketValue = currentPrice ? currentPrice * h.shares : h.avgCost * h.shares;
    const costBasis = h.avgCost * h.shares;
    return { ...h, quote, ai, marketValue, pnl: marketValue - costBasis, pnlPct: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0 };
  });

  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = enriched.reduce((s, h) => s + h.avgCost * h.shares, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalPositive = totalPnl >= 0;

  const actionCounts: Record<string, number> = {};
  enriched.forEach((h) => { const a = h.ai?.action ?? "HOLD"; actionCounts[a] = (actionCounts[a] ?? 0) + 1; });

  const etfValue = enriched.filter((h) => ETF_TICKERS.has(h.ticker)).reduce((s, h) => s + h.marketValue, 0);
  const stockValue = totalValue - etfValue;
  const etfPct = totalValue > 0 ? (etfValue / totalValue) * 100 : 0;
  const stockPct = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;

  // Group by account
  const accounts = [...new Set(holdings.map((h) => h.account))];

  function renderAddForm() {
    return (
      <div className="rounded-2xl bg-bg-surface p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Add Stock</span>
          <button onClick={() => setShowAdd(false)}><X size={16} className="text-text-secondary" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Ticker" value={addForm.ticker} onChange={(e) => setAddForm({ ...addForm, ticker: e.target.value.toUpperCase() })} className="rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          <input placeholder="Shares" type="number" value={addForm.shares} onChange={(e) => setAddForm({ ...addForm, shares: e.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          <input placeholder="Avg Cost" type="number" value={addForm.avgCost} onChange={(e) => setAddForm({ ...addForm, avgCost: e.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          <input placeholder="Account" value={addForm.account} onChange={(e) => setAddForm({ ...addForm, account: e.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
        <button onClick={handleAdd} className="w-full rounded-lg bg-info py-2 text-sm font-medium text-white">Add</button>
      </div>
    );
  }

  function renderCard(h: EnrichedHolding, index: number) {
    const positive = h.pnl >= 0;
    const action = h.ai?.action ?? "HOLD";
    const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;

    return (
      <div key={`${h.account}-${h.ticker}-${index}`} className="rounded-2xl bg-bg-surface p-4 transition-all">
        <Link href={`/stock/${h.ticker}`} className="block">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{h.ticker}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>{action}</span>
              </div>
              <div className="text-[11px] text-text-secondary">{h.quote?.name ?? ""} · {h.shares} shares @ ${h.avgCost.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">${h.quote?.price?.toFixed(2) ?? "--"}</div>
              <div className={`text-xs font-semibold ${positive ? "text-bullish" : "text-bearish"}`}>
                {positive ? "+" : ""}{h.pnlPct.toFixed(1)}% <span className="text-[10px]">${h.pnl.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {h.ai && (
            <>
              <div className="mt-3 space-y-1">
                <ScoreBar label="Technical" score={h.ai.technicalScore} color="bg-info" />
                <ScoreBar label="Fundamental" score={h.ai.fundamentalScore} color="bg-bullish" />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px]">
                {h.ai.targetUpside > 0 && <span className="font-bold text-bullish">+{h.ai.targetUpside}% target</span>}
                {h.quote?.rsi && <span className="text-text-secondary">RSI {h.quote.rsi}</span>}
                <div className="ml-auto flex items-center gap-1">
                  <Shield size={10} className="text-bullish" />
                  <MoatDots score={h.ai.moatScore} />
                </div>
              </div>
              {h.ai.buyAtPrice && h.quote && (
                <div className="mt-2 rounded-lg bg-bullish/5 px-3 py-1.5 text-[11px]">
                  <span className="font-bold text-bullish">
                    {h.quote.price <= h.ai.buyAtPrice ? "🟢 At buy zone" : h.quote.price <= h.ai.buyAtPrice * 1.05 ? "🟡 Near buy zone" : `Wait for $${h.ai.buyAtPrice}`}
                  </span>
                </div>
              )}
              <div className="mt-2 text-[11px] text-text-secondary">↗ {h.ai.analysis}</div>
            </>
          )}
          {!h.ai && aiLoading && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-text-secondary"><Loader2 size={10} className="animate-spin" /> Analyzing...</div>
          )}

          <div className="mt-2 flex items-center justify-end text-[9px] text-info">Details <ArrowRight size={8} className="ml-0.5" /></div>
        </Link>
        <button onClick={() => handleRemove(index)} className="mt-1 text-[10px] text-text-secondary hover:text-bearish">Remove</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="text-xs font-medium text-text-secondary">Total Portfolio</div>
        <div className="mt-1 text-3xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${totalPositive ? "text-bullish" : "text-bearish"}`}>
          {totalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {totalPositive ? "+" : ""}${totalPnl.toFixed(2)} ({totalPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%)
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
          {Object.entries(actionCounts).map(([a, c]) => {
            const s = ACTION_STYLES[a] ?? ACTION_STYLES.HOLD;
            return <span key={a} className={`rounded-full px-2.5 py-1 ${s.bg} ${s.text}`}>{c} {a}</span>;
          })}
          {aiLoading && <span className="flex items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1 text-text-secondary"><Loader2 size={10} className="animate-spin" /> Analyzing...</span>}
        </div>
        {/* ETF vs Stocks split */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-semibold text-info">ETFs {etfPct.toFixed(1)}%</span>
            <span className="font-semibold text-violet-500">Stocks {stockPct.toFixed(1)}%</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-border">
            {etfPct > 0 && <div className="bg-info rounded-l-full" style={{ width: `${etfPct}%` }} />}
            {stockPct > 0 && <div className="bg-violet-500 rounded-r-full" style={{ width: `${stockPct}%` }} />}
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-secondary mt-1">
            <span>${etfValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>${stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 rounded-xl bg-info/10 px-3 py-2 text-xs font-medium text-info">
          <Plus size={14} /> Add Stock
        </button>
        <label className="flex cursor-pointer items-center gap-1 rounded-xl bg-bg-surface px-3 py-2 text-xs font-medium text-text-secondary border border-border">
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {importing ? "Importing..." : "Import Screenshot"}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </label>
        <button
          onClick={() => setShowRebalancer(!showRebalancer)}
          className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${showRebalancer ? "bg-info/15 text-info" : "bg-bg-surface text-text-secondary border border-border"}`}
        >
          <ArrowRightLeft size={14} /> Rebalance
        </button>
      </div>

      {showAdd && renderAddForm()}

      {showRebalancer && <ETFRebalancer quotes={quotes as Record<string, { price: number; name?: string }>} />}

      {/* Holdings by account */}
      {accounts.map((account) => (
        <div key={account}>
          <div className="mb-2 px-1 text-sm font-semibold">{account}</div>
          <div className="space-y-2">
            {enriched.filter((h) => h.account === account).map((h) => {
              const idx = holdings.findIndex((hh) => hh.ticker === h.ticker && hh.account === h.account);
              return renderCard(h, idx);
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
