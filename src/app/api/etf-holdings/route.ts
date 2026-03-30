import { NextResponse } from "next/server";

// ETF tickers from the portfolio
const ETF_TICKERS = ["VOO", "QQQ", "VTWO", "XLV", "CWEB", "IBIT"];

interface ETFHoldingItem {
  symbol: string;
  holdingName: string;
  holdingPercent: number;
}

interface ETFData {
  symbol: string;
  name: string;
  holdings: ETFHoldingItem[];
}

interface OverlapPair {
  etf1: string;
  etf2: string;
  sharedHoldings: { symbol: string; name: string; pct1: number; pct2: number }[];
  overlapPercent: number; // combined weight of shared holdings (avg of both ETFs)
}

async function fetchETFHoldings(symbol: string): Promise<ETFData | null> {
  try {
    // Use Yahoo Finance quoteSummary with topHoldings module
    const res = await fetch(
      `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=topHoldings,price`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 86400 }, // cache 24h — holdings don't change often
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const topHoldings = result.topHoldings?.holdings ?? [];
    const name = result.price?.longName ?? result.price?.shortName ?? symbol;

    const holdings: ETFHoldingItem[] = topHoldings
      .filter((h: Record<string, unknown>) => h.symbol)
      .map((h: Record<string, unknown>) => ({
        symbol: String(h.symbol),
        holdingName: String(h.holdingName ?? h.symbol),
        holdingPercent: Number(
          (h.holdingPercent as Record<string, unknown>)?.raw ?? 0
        ) * 100,
      }));

    return { symbol, name, holdings };
  } catch {
    return null;
  }
}

function computeOverlaps(etfs: ETFData[]): OverlapPair[] {
  const overlaps: OverlapPair[] = [];

  for (let i = 0; i < etfs.length; i++) {
    for (let j = i + 1; j < etfs.length; j++) {
      const etf1 = etfs[i];
      const etf2 = etfs[j];

      // Build lookup of holdings by symbol for etf2
      const etf2Map = new Map(
        etf2.holdings.map((h) => [h.symbol, h])
      );

      const shared: OverlapPair["sharedHoldings"] = [];
      for (const h1 of etf1.holdings) {
        const h2 = etf2Map.get(h1.symbol);
        if (h2) {
          shared.push({
            symbol: h1.symbol,
            name: h1.holdingName,
            pct1: Math.round(h1.holdingPercent * 100) / 100,
            pct2: Math.round(h2.holdingPercent * 100) / 100,
          });
        }
      }

      if (shared.length > 0) {
        const totalPct1 = shared.reduce((s, h) => s + h.pct1, 0);
        const totalPct2 = shared.reduce((s, h) => s + h.pct2, 0);
        overlaps.push({
          etf1: etf1.symbol,
          etf2: etf2.symbol,
          sharedHoldings: shared.sort((a, b) => b.pct1 + b.pct2 - (a.pct1 + a.pct2)),
          overlapPercent: Math.round(((totalPct1 + totalPct2) / 2) * 100) / 100,
        });
      }
    }
  }

  return overlaps.sort((a, b) => b.overlapPercent - a.overlapPercent);
}

export async function GET() {
  const etfResults = await Promise.all(ETF_TICKERS.map(fetchETFHoldings));
  const etfs = etfResults.filter((e): e is ETFData => e !== null);
  const overlaps = computeOverlaps(etfs);

  return NextResponse.json({ etfs, overlaps });
}
