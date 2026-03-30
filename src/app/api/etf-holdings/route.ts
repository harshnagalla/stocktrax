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
  totalHoldings: number;
  holdings: ETFHoldingItem[];
}

interface OverlapPair {
  etf1: string;
  etf2: string;
  sharedCount: number;
  sharedHoldings: { symbol: string; name: string; pct1: number; pct2: number }[];
  overlapPercent: number;
}

interface OverlapMatrix {
  [etf1: string]: { [etf2: string]: number }; // number = shared company count
}

async function fetchETFHoldings(symbol: string): Promise<ETFData | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=topHoldings,price`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 86400 },
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

    return {
      symbol,
      name,
      totalHoldings: holdings.length,
      holdings,
    };
  } catch {
    return null;
  }
}

function computeOverlaps(etfs: ETFData[]): { pairs: OverlapPair[]; matrix: OverlapMatrix } {
  const pairs: OverlapPair[] = [];
  const matrix: OverlapMatrix = {};

  // Initialize matrix
  for (const etf of etfs) {
    matrix[etf.symbol] = {};
    for (const other of etfs) {
      matrix[etf.symbol][other.symbol] = etf.symbol === other.symbol ? etf.totalHoldings : 0;
    }
  }

  for (let i = 0; i < etfs.length; i++) {
    for (let j = i + 1; j < etfs.length; j++) {
      const etf1 = etfs[i];
      const etf2 = etfs[j];

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

      const sharedCount = shared.length;
      matrix[etf1.symbol][etf2.symbol] = sharedCount;
      matrix[etf2.symbol][etf1.symbol] = sharedCount;

      if (sharedCount > 0) {
        const totalPct1 = shared.reduce((s, h) => s + h.pct1, 0);
        const totalPct2 = shared.reduce((s, h) => s + h.pct2, 0);
        pairs.push({
          etf1: etf1.symbol,
          etf2: etf2.symbol,
          sharedCount,
          sharedHoldings: shared.sort((a, b) => b.pct1 + b.pct2 - (a.pct1 + a.pct2)),
          overlapPercent: Math.round(((totalPct1 + totalPct2) / 2) * 100) / 100,
        });
      }
    }
  }

  return {
    pairs: pairs.sort((a, b) => b.overlapPercent - a.overlapPercent),
    matrix,
  };
}

export async function GET() {
  const etfResults = await Promise.all(ETF_TICKERS.map(fetchETFHoldings));
  const etfs = etfResults.filter((e): e is ETFData => e !== null);
  const { pairs, matrix } = computeOverlaps(etfs);

  return NextResponse.json({ etfs, overlaps: pairs, matrix });
}
