"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Briefcase,
  Camera,
  Check,
  Loader2,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
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
  price?: number;
  changePercent?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  sma50?: number;
  sma150?: number;
  rsi?: number;
  signal?: string;
  buyAt?: number | null;
  name?: string;
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
  index: number;
  quote: QuoteData | null;
  ai: AiData | null;
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
  allocationPct: number;
}

type FilterKey = "ALL" | "BUY" | "HOLD" | "WATCH" | "SELL";

const ETF_TICKERS = new Set(["QQQ", "VOO", "VTWO", "XLV", "IBIT", "CWEB", "SPY", "IWM", "DIA", "VTI", "SCHD", "ARKK", "EEM", "GLD", "TLT", "HYG", "LQD", "BND", "VEA", "VWO", "KWEB", "MCHI", "FXI", "ASHR", "CQQQ", "CHIQ"]);
const CHINA_TICKERS = new Set(["BABA", "JD", "PDD", "BIDU", "NIO", "XPEV", "LI", "TCOM", "VIPS", "TME", "IQ", "YMM", "YUMC", "BZ", "KC", "DQ", "RLX", "NTES", "WB", "MOMO", "TAL", "EDU", "GDS", "DOYU", "HUYA", "FINV", "ZH", "LAIX", "TUYA", "KWEB", "MCHI", "FXI", "CWEB", "ASHR", "CQQQ", "CHIQ"]);
const INTL_TICKERS = new Set(["VEA", "VWO", "ACWI", "VXUS", "IXUS", "EFA", "VT", "EEM"]);

const ACTION_STYLES: Record<string, { bg: string; text: string; bar: string; ring: string }> = {
  BUY: { bg: "bg-bullish/15", text: "text-bullish", bar: "bg-bullish", ring: "ring-bullish/20" },
  HOLD: { bg: "bg-info/10", text: "text-info", bar: "bg-info", ring: "ring-info/20" },
  WATCH: { bg: "bg-neutral/15", text: "text-neutral", bar: "bg-neutral", ring: "ring-neutral/20" },
  SELL: { bg: "bg-bearish/15", text: "text-bearish", bar: "bg-bearish", ring: "ring-bearish/20" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "BUY", label: "Buy" },
  { key: "HOLD", label: "Hold" },
  { key: "WATCH", label: "Watch" },
  { key: "SELL", label: "Sell" },
];

function asAction(value?: string | null): FilterKey {
  const action = value?.toUpperCase();
  if (action === "BUY" || action === "SELL" || action === "WATCH") return action;
  return "HOLD";
}

function actionForHolding(holding: EnrichedHolding): FilterKey {
  return asAction(holding.ai?.action ?? holding.quote?.signal);
}

function formatCurrency(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const safeScore = Number.isFinite(score) ? Math.round(score) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-text-secondary">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(safeScore, 100))}%` }} />
      </div>
      <span className="w-6 text-right text-[10px] font-bold">{safeScore}</span>
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
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRebalancer, setShowRebalancer] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [quoteRefreshToken, setQuoteRefreshToken] = useState(0);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ added: string[]; updated: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ ticker: "", shares: "", avgCost: "", account: "" });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ shares: "", avgCost: "", account: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setPortfolioError(null);
      try {
        const res = await authFetch("/api/user-portfolio");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Portfolio failed to load");
        if (!cancelled && data.holdings?.length > 0) setHoldings(data.holdings);
      } catch (err) {
        if (!cancelled) setPortfolioError(err instanceof Error ? err.message : "Portfolio failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, email]);

  useEffect(() => {
    if (holdings.length === 0) {
      setQuotes({});
      setQuoteError(null);
      return;
    }

    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    let cancelled = false;

    async function loadQuotes() {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(tickers.join(","))}&analyze=true`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Prices failed to load");
        if (!cancelled) setQuotes(data);
      } catch (err) {
        if (!cancelled) setQuoteError(err instanceof Error ? err.message : "Prices failed to load");
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }

    void loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [holdings, quoteRefreshToken]);

  useEffect(() => {
    const tickers = [...new Set(holdings.filter((h) => h.ticker !== "CASH").map((h) => h.ticker))];
    if (tickers.length === 0) {
      setAiData({});
      return;
    }

    let cancelled = false;

    async function loadAi() {
      setAiLoading(true);
      try {
        const res = await fetch(`/api/portfolio-analysis?symbols=${encodeURIComponent(tickers.join(","))}`);
        const data = res.ok ? await res.json() : {};
        if (!cancelled && data && !(data as Record<string, unknown>).error) setAiData(data);
      } catch {
        if (!cancelled) setAiData({});
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }

    void loadAi();
    return () => {
      cancelled = true;
    };
  }, [holdings]);

  const saveHoldings = useCallback(async (newHoldings: Holding[]) => {
    setSaving(true);
    setSaveError(null);
    setHoldings(newHoldings);
    try {
      const res = await authFetch("/api/user-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: newHoldings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Portfolio save failed");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Portfolio save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  function mergeHoldings(existing: Holding[], incoming: Holding[]): { merged: Holding[]; added: string[]; updated: string[] } {
    const result = [...existing];
    const added: string[] = [];
    const updated: string[] = [];

    for (const inc of incoming) {
      const idx = result.findIndex((h) => h.ticker === inc.ticker && h.account === inc.account);
      if (idx === -1) {
        result.push(inc);
        added.push(inc.ticker);
      } else {
        const old = result[idx];
        if (old.shares !== inc.shares || Math.abs(old.avgCost - inc.avgCost) > 0.01) {
          result[idx] = inc;
          updated.push(inc.ticker);
        }
      }
    }

    return { merged: result, added, updated };
  }

  const handleAdd = async () => {
    const ticker = addForm.ticker.toUpperCase().trim();
    const shares = parsePositiveNumber(addForm.shares);
    if (!ticker || !shares) return;

    const isCash = ticker === "CASH";
    const avgCost = isCash ? 1 : Number.parseFloat(addForm.avgCost);
    const newHolding: Holding = {
      ticker,
      shares,
      avgCost: Number.isFinite(avgCost) && avgCost >= 0 ? avgCost : 0,
      account: addForm.account.trim() || "Default",
    };

    const { merged } = mergeHoldings(holdings, [newHolding]);
    await saveHoldings(merged);
    setAddForm({ ticker: "", shares: "", avgCost: "", account: "" });
    setShowAdd(false);
  };

  const handleRemove = async (index: number) => {
    await saveHoldings(holdings.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async (index: number) => {
    const current = holdings[index];
    if (!current) return;

    const shares = parsePositiveNumber(editForm.shares) ?? current.shares;
    const avgCost = current.ticker === "CASH"
      ? 1
      : Number.parseFloat(editForm.avgCost);
    const updated = holdings.map((h, i) =>
      i === index
        ? {
            ...h,
            shares,
            avgCost: Number.isFinite(avgCost) && avgCost >= 0 ? avgCost : h.avgCost,
            account: editForm.account.trim() || h.account,
          }
        : h
    );

    await saveHoldings(updated);
    setEditingIndex(null);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    setImportError(null);

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

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Import failed");
        return;
      }

      if (data.holdings?.length > 0) {
        const { merged, added, updated } = mergeHoldings(holdings, data.holdings);
        await saveHoldings(merged);
        setImportResult({ added, updated });
        setTimeout(() => setImportResult(null), 5000);
      } else {
        setImportError("No holdings found");
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const enrichedBase = useMemo<EnrichedHolding[]>(() => {
    return holdings.map((h, index) => {
      const quote = quotes[h.ticker] ?? null;
      const ai = aiData[h.ticker] ?? null;
      const currentPrice = typeof quote?.price === "number" ? quote.price : null;
      const marketValue = currentPrice != null ? currentPrice * h.shares : h.avgCost * h.shares;
      const costBasis = h.avgCost * h.shares;

      return {
        ...h,
        index,
        quote,
        ai,
        marketValue,
        costBasis,
        pnl: marketValue - costBasis,
        pnlPct: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0,
        allocationPct: 0,
      };
    });
  }, [holdings, quotes, aiData]);

  const totals = useMemo(() => {
    const totalValue = enrichedBase.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCost = enrichedBase.reduce((sum, h) => sum + h.costBasis, 0);
    const totalPnl = totalValue - totalCost;
    const cashValue = enrichedBase.filter((h) => h.ticker === "CASH").reduce((sum, h) => sum + h.marketValue, 0);
    const etfValue = enrichedBase.filter((h) => ETF_TICKERS.has(h.ticker) && h.ticker !== "CASH").reduce((sum, h) => sum + h.marketValue, 0);
    const stockValue = totalValue - etfValue - cashValue;
    const investedValue = totalValue - cashValue;
    const chinaValue = enrichedBase.filter((h) => CHINA_TICKERS.has(h.ticker)).reduce((sum, h) => sum + h.marketValue, 0);
    const intlValue = enrichedBase.filter((h) => INTL_TICKERS.has(h.ticker) && !CHINA_TICKERS.has(h.ticker)).reduce((sum, h) => sum + h.marketValue, 0);
    const usValue = investedValue - chinaValue - intlValue;

    return {
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
      cashValue,
      etfValue,
      stockValue,
      investedValue,
      chinaValue,
      intlValue,
      usValue,
      cashPct: totalValue > 0 ? (cashValue / totalValue) * 100 : 0,
      etfPct: totalValue > 0 ? (etfValue / totalValue) * 100 : 0,
      stockPct: totalValue > 0 ? (stockValue / totalValue) * 100 : 0,
      chinaPct: investedValue > 0 ? (chinaValue / investedValue) * 100 : 0,
      intlPct: investedValue > 0 ? (intlValue / investedValue) * 100 : 0,
      usPct: investedValue > 0 ? (usValue / investedValue) * 100 : 0,
    };
  }, [enrichedBase]);

  const enriched = useMemo(() => {
    return enrichedBase
      .map((holding) => ({
        ...holding,
        allocationPct: totals.totalValue > 0 ? (holding.marketValue / totals.totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [enrichedBase, totals.totalValue]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = { ALL: enriched.length, BUY: 0, HOLD: 0, WATCH: 0, SELL: 0 };
    enriched.forEach((holding) => {
      counts[actionForHolding(holding)] += 1;
    });
    return counts;
  }, [enriched]);

  const filteredHoldings = useMemo(() => {
    if (activeFilter === "ALL") return enriched;
    return enriched.filter((holding) => actionForHolding(holding) === activeFilter);
  }, [activeFilter, enriched]);

  const accountSummaries = useMemo(() => {
    return [...new Set(enriched.map((h) => h.account))]
      .map((account) => {
        const items = enriched.filter((h) => h.account === account);
        const value = items.reduce((sum, h) => sum + h.marketValue, 0);
        const cost = items.reduce((sum, h) => sum + h.costBasis, 0);
        const pnl = value - cost;
        return {
          account,
          count: items.length,
          value,
          pnl,
          pct: totals.totalValue > 0 ? (value / totals.totalValue) * 100 : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [enriched, totals.totalValue]);

  const topHolding = enriched.filter((h) => h.ticker !== "CASH")[0];
  const sellCount = filterCounts.SELL;
  const buyCount = filterCounts.BUY;
  const missingQuoteCount = enriched.filter((h) => h.ticker !== "CASH" && !h.quote?.price).length;
  const visibleAccounts = [...new Set(filteredHoldings.map((h) => h.account))];

  function renderNotice() {
    const message = portfolioError ?? saveError ?? quoteError;
    if (!message && !importResult && !importError) return null;

    return (
      <div className="space-y-2">
        {message && (
          <div className="flex items-start gap-2 rounded-xl bg-bearish/10 px-4 py-3 text-xs font-medium text-bearish">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {importError && (
          <div className="flex items-start gap-2 rounded-xl bg-bearish/10 px-4 py-3 text-xs font-medium text-bearish">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
        {importResult && (importResult.added.length > 0 || importResult.updated.length > 0) && (
          <div className="rounded-xl bg-bullish/10 px-4 py-3 text-xs font-medium text-bullish">
            {importResult.added.length > 0 && <span>Added: {importResult.added.join(", ")}. </span>}
            {importResult.updated.length > 0 && <span>Updated: {importResult.updated.join(", ")}.</span>}
          </div>
        )}
      </div>
    );
  }

  function renderAddForm() {
    const ticker = addForm.ticker.trim().toUpperCase();
    const isCash = ticker === "CASH";
    const canSubmit = Boolean(ticker && parsePositiveNumber(addForm.shares));

    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Add Position</div>
            <div className="text-xs text-text-secondary">{isCash ? "Cash balance" : "Ticker, shares, cost basis"}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border"
            aria-label="Close add position form"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            placeholder="Ticker"
            value={addForm.ticker}
            onChange={(e) => setAddForm({ ...addForm, ticker: e.target.value.toUpperCase() })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-info focus:outline-none"
          />
          <input
            placeholder={isCash ? "Amount" : "Shares"}
            type="number"
            value={addForm.shares}
            onChange={(e) => setAddForm({ ...addForm, shares: e.target.value })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-info focus:outline-none"
          />
          <input
            placeholder="Avg cost"
            type="number"
            value={isCash ? "1" : addForm.avgCost}
            onChange={(e) => setAddForm({ ...addForm, avgCost: e.target.value })}
            disabled={isCash}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-info focus:outline-none disabled:opacity-50"
          />
          <input
            placeholder="Account"
            value={addForm.account}
            onChange={(e) => setAddForm({ ...addForm, account: e.target.value })}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-info focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canSubmit || saving}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-info py-3 text-sm font-semibold text-white shadow-sm shadow-info/25 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add Position
        </button>
      </div>
    );
  }

  function renderToolbar() {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdd((current) => !current)}
            className="flex items-center gap-1.5 rounded-full bg-info px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-info/25 transition-all active:scale-[0.98]"
          >
            <Plus size={14} /> Add
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-bg-surface px-4 py-2 text-xs font-medium text-text-secondary transition-all active:scale-[0.98]">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? "Importing" : "Import"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          </label>
          <button
            type="button"
            onClick={() => setShowRebalancer((current) => !current)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-[0.98] ${showRebalancer ? "bg-info/15 text-info" : "border border-border bg-bg-surface text-text-secondary"}`}
          >
            <ArrowRightLeft size={14} /> Rebalance
          </button>
          <button
            type="button"
            onClick={() => setQuoteRefreshToken((current) => current + 1)}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-all active:scale-[0.98]"
          >
            <RefreshCw size={14} className={quoteLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-bg-surface p-1">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${active ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"}`}
              >
                {filter.label}
                <span className="text-[10px] opacity-70">{filterCounts[filter.key]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSummary() {
    const totalPositive = totals.totalPnl >= 0;
    const topHoldingPct = topHolding?.allocationPct ?? 0;

    return (
      <div className="rounded-2xl bg-bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-text-secondary">Total Portfolio</div>
            <div className="mt-1 text-3xl font-bold tracking-normal">{formatCurrency(totals.totalValue)}</div>
            <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${totalPositive ? "text-bullish" : "text-bearish"}`}>
              {totalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {totalPositive ? "+" : ""}{formatCurrency(totals.totalPnl)} ({totalPositive ? "+" : ""}{totals.totalPnlPct.toFixed(2)}%)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-secondary">Positions</div>
            <div className="mt-1 text-2xl font-bold">{holdings.length}</div>
            {(quoteLoading || saving) && (
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-text-secondary">
                <Loader2 size={10} className="animate-spin" />
                {saving ? "Saving" : "Prices"}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-white/50">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary">
              <Wallet size={11} /> Cash
            </div>
            <div className="mt-1 text-sm font-bold">{formatCompactCurrency(totals.cashValue)}</div>
            <div className="text-[10px] text-text-secondary">{totals.cashPct.toFixed(0)}%</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary">
              <PieChart size={11} /> ETFs
            </div>
            <div className="mt-1 text-sm font-bold">{formatCompactCurrency(totals.etfValue)}</div>
            <div className="text-[10px] text-text-secondary">{totals.etfPct.toFixed(0)}%</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary">
              <BarChart3 size={11} /> Stocks
            </div>
            <div className="mt-1 text-sm font-bold">{formatCompactCurrency(totals.stockValue)}</div>
            <div className="text-[10px] text-text-secondary">{totals.stockPct.toFixed(0)}%</div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-medium text-text-secondary">Asset Mix</span>
              <span className="text-text-secondary">{formatCompactCurrency(totals.totalValue)}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-border">
              {totals.etfPct > 0 && <div className="bg-info" style={{ width: `${totals.etfPct}%` }} />}
              {totals.stockPct > 0 && <div className="bg-neutral" style={{ width: `${totals.stockPct}%` }} />}
              {totals.cashPct > 0 && <div className="bg-bullish" style={{ width: `${totals.cashPct}%` }} />}
            </div>
            <div className="mt-1 flex gap-3 text-[10px] font-semibold">
              <span className="text-info">ETF {totals.etfPct.toFixed(0)}%</span>
              <span className="text-neutral">Stock {totals.stockPct.toFixed(0)}%</span>
              {totals.cashPct > 0 && <span className="text-bullish">Cash {totals.cashPct.toFixed(0)}%</span>}
            </div>
          </div>

          {totals.investedValue > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-text-secondary">Region Mix</span>
                <span className="text-text-secondary">{formatCompactCurrency(totals.investedValue)}</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-border">
                {totals.usPct > 0 && <div className="bg-info" style={{ width: `${totals.usPct}%` }} />}
                {totals.chinaPct > 0 && <div className="bg-bearish" style={{ width: `${totals.chinaPct}%` }} />}
                {totals.intlPct > 0 && <div className="bg-neutral" style={{ width: `${totals.intlPct}%` }} />}
              </div>
              <div className="mt-1 flex gap-3 text-[10px] font-semibold">
                <span className="text-info">US {totals.usPct.toFixed(0)}%</span>
                {totals.chinaPct > 0 && <span className="text-bearish">China {totals.chinaPct.toFixed(0)}%</span>}
                {totals.intlPct > 0 && <span className="text-neutral">Intl {totals.intlPct.toFixed(0)}%</span>}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary">
              <Briefcase size={11} /> Accounts
            </div>
            <div className="mt-2 space-y-1.5">
              {accountSummaries.map((item) => (
                <div key={item.account} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-text-secondary">{item.account}</span>
                  <span className="shrink-0 font-bold">{item.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary">
              <AlertTriangle size={11} /> Focus
            </div>
            <div className="mt-2 text-xs leading-relaxed">
              {topHolding ? (
                <span><strong>{topHolding.ticker}</strong> is {topHoldingPct.toFixed(0)}%.</span>
              ) : (
                <span>No concentration yet.</span>
              )}
            </div>
            <div className="mt-1 text-[10px] text-text-secondary">
              {sellCount > 0 ? `${sellCount} sell flags` : buyCount > 0 ? `${buyCount} buy candidates` : "No urgent flags"}
            </div>
          </div>
        </div>

        {missingQuoteCount > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral/10 px-3 py-2 text-[11px] font-medium text-neutral">
            <AlertTriangle size={13} />
            {missingQuoteCount} position{missingQuoteCount === 1 ? "" : "s"} using cost basis until prices load.
          </div>
        )}
      </div>
    );
  }

  function renderCashCard(h: EnrichedHolding) {
    const isEditing = editingIndex === h.index;

    return (
      <div key={`${h.account}-${h.ticker}-${h.index}`} className="rounded-2xl bg-bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Cash</span>
              <span className="rounded-full bg-bullish/15 px-2 py-0.5 text-[10px] font-bold text-bullish">CASH</span>
            </div>
            <div className="text-[11px] text-text-secondary">{h.account}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{formatCurrency(h.marketValue)}</div>
            <div className="text-[10px] font-semibold text-text-secondary">{h.allocationPct.toFixed(1)}% allocation</div>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-bullish" style={{ width: `${Math.min(h.allocationPct, 100)}%` }} />
        </div>

        {renderEditArea(h, isEditing)}
      </div>
    );
  }

  function renderHoldingCard(h: EnrichedHolding) {
    if (h.ticker === "CASH") return renderCashCard(h);

    const action = actionForHolding(h);
    const style = ACTION_STYLES[action] ?? ACTION_STYLES.HOLD;
    const positive = h.pnl >= 0;
    const dayChange = h.quote?.changePercent;
    const isEditing = editingIndex === h.index;
    const price = typeof h.quote?.price === "number" ? h.quote.price : null;
    const buyAtPrice = h.ai?.buyAtPrice ?? h.quote?.buyAt ?? null;

    return (
      <div key={`${h.account}-${h.ticker}-${h.index}`} className={`rounded-2xl bg-bg-surface p-4 ring-1 ring-transparent ${style.ring}`}>
        <Link href={`/stock/${h.ticker}`} className="block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{h.ticker}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>{action}</span>
              </div>
              <div className="truncate text-[11px] text-text-secondary">{h.quote?.name ?? h.account}</div>
              <div className="mt-0.5 text-[10px] text-text-secondary">{formatNumber(h.shares)} shares @ {formatCurrency(h.avgCost)}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold">{price != null ? formatCurrency(price) : "--"}</div>
              <div className={`text-xs font-semibold ${typeof dayChange === "number" && dayChange < 0 ? "text-bearish" : "text-bullish"}`}>
                {typeof dayChange === "number" ? `${dayChange >= 0 ? "+" : ""}${dayChange.toFixed(1)}% today` : "No quote"}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 divide-x divide-border border-y border-border py-2">
            <div className="pr-2">
              <div className="text-[10px] text-text-secondary">Value</div>
              <div className="text-xs font-bold">{formatCompactCurrency(h.marketValue)}</div>
            </div>
            <div className="px-2">
              <div className="text-[10px] text-text-secondary">P/L</div>
              <div className={`text-xs font-bold ${positive ? "text-bullish" : "text-bearish"}`}>
                {positive ? "+" : ""}{formatCompactCurrency(h.pnl)}
              </div>
            </div>
            <div className="pl-2">
              <div className="text-[10px] text-text-secondary">Weight</div>
              <div className="text-xs font-bold">{h.allocationPct.toFixed(1)}%</div>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(h.allocationPct, 100)}%` }} />
          </div>

          {h.ai ? (
            <div className="mt-3 space-y-2">
              <div className="space-y-1">
                <ScoreBar label="Technical" score={h.ai.technicalScore} color="bg-info" />
                <ScoreBar label="Fundamental" score={h.ai.fundamentalScore} color="bg-bullish" />
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                {h.ai.targetUpside > 0 && <span className="font-bold text-bullish">+{h.ai.targetUpside}% target</span>}
                {h.quote?.rsi != null && <span className="text-text-secondary">RSI {h.quote.rsi}</span>}
                <div className="ml-auto flex items-center gap-1">
                  <Shield size={10} className="text-bullish" />
                  <MoatDots score={h.ai.moatScore} />
                </div>
              </div>
              {buyAtPrice && price != null && (
                <div className="rounded-lg bg-bullish/5 px-3 py-1.5 text-[11px] font-bold text-bullish">
                  {price <= buyAtPrice ? "At buy zone" : price <= buyAtPrice * 1.05 ? "Near buy zone" : `Wait for ${formatCurrency(buyAtPrice)}`}
                </div>
              )}
              <div className="line-clamp-2 text-[11px] leading-relaxed text-text-secondary">{h.ai.analysis}</div>
            </div>
          ) : aiLoading ? (
            <div className="mt-3 flex items-center gap-1 text-[10px] text-text-secondary">
              <Loader2 size={10} className="animate-spin" /> Analyzing
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-end text-[10px] font-semibold text-info">
            Details <ArrowRight size={10} className="ml-1" />
          </div>
        </Link>

        {renderEditArea(h, isEditing)}
      </div>
    );
  }

  function renderEditArea(h: EnrichedHolding, isEditing: boolean) {
    if (isEditing) {
      const isCash = h.ticker === "CASH";
      return (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={editForm.shares}
              onChange={(e) => setEditForm({ ...editForm, shares: e.target.value })}
              placeholder={isCash ? "Amount" : "Shares"}
              className="min-w-0 rounded-lg border border-border bg-white px-2 py-1.5 text-xs focus:border-info focus:outline-none"
            />
            <input
              type="number"
              value={isCash ? "1" : editForm.avgCost}
              onChange={(e) => setEditForm({ ...editForm, avgCost: e.target.value })}
              placeholder="Avg cost"
              disabled={isCash}
              className="min-w-0 rounded-lg border border-border bg-white px-2 py-1.5 text-xs focus:border-info focus:outline-none disabled:opacity-50"
            />
            <input
              type="text"
              value={editForm.account}
              onChange={(e) => setEditForm({ ...editForm, account: e.target.value })}
              placeholder="Account"
              className="min-w-0 rounded-lg border border-border bg-white px-2 py-1.5 text-xs focus:border-info focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveEdit(h.index)}
              disabled={saving}
              className="flex items-center gap-1 rounded-full bg-bullish px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Save
            </button>
            <button type="button" onClick={() => setEditingIndex(null)} className="rounded-full px-3 py-1.5 text-[10px] font-bold text-text-secondary">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <div className="text-[10px] text-text-secondary">{h.account}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingIndex(h.index);
              setEditForm({ shares: String(h.shares), avgCost: String(h.avgCost), account: h.account });
            }}
            className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-info"
            aria-label={`Edit ${h.ticker}`}
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => handleRemove(h.index)}
            className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-bearish"
            aria-label={`Remove ${h.ticker}`}
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-bg-surface p-5">
          <div className="h-3 w-28 rounded-full bg-border" />
          <div className="mt-3 h-8 w-44 rounded-full bg-border" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="h-16 rounded-xl bg-border" />
            <div className="h-16 rounded-xl bg-border" />
            <div className="h-16 rounded-xl bg-border" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-bg-surface p-10 text-text-secondary">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading portfolio</span>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-bg-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 text-info">
            <Wallet size={24} />
          </div>
          <div className="mt-4 text-base font-semibold">No Holdings</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-full bg-info px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-info/25 transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> Add
            </button>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-secondary transition-all active:scale-[0.98]">
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {importing ? "Importing" : "Import"}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
            </label>
          </div>
        </div>
        {renderNotice()}
        {showAdd && renderAddForm()}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderSummary()}
      {renderToolbar()}
      {renderNotice()}
      {showAdd && renderAddForm()}
      {showRebalancer && <ETFRebalancer quotes={quotes as Record<string, { price: number; name?: string }>} />}

      {filteredHoldings.length === 0 ? (
        <div className="rounded-2xl bg-bg-surface p-6 text-center">
          <SlidersHorizontal size={18} className="mx-auto text-text-secondary" />
          <div className="mt-2 text-sm font-semibold">No {activeFilter.toLowerCase()} positions</div>
        </div>
      ) : (
        visibleAccounts.map((account) => {
          const accountSummary = accountSummaries.find((item) => item.account === account);
          const accountHoldings = filteredHoldings.filter((h) => h.account === account);

          return (
            <section key={account}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div>
                  <div className="text-sm font-semibold">{account}</div>
                  <div className="text-[10px] text-text-secondary">{accountHoldings.length} position{accountHoldings.length === 1 ? "" : "s"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">{formatCompactCurrency(accountSummary?.value ?? 0)}</div>
                  <div className={`text-[10px] font-semibold ${(accountSummary?.pnl ?? 0) >= 0 ? "text-bullish" : "text-bearish"}`}>
                    {(accountSummary?.pnl ?? 0) >= 0 ? "+" : ""}{formatCompactCurrency(accountSummary?.pnl ?? 0)}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {accountHoldings.map((holding) => renderHoldingCard(holding))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
