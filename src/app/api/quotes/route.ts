import { NextRequest, NextResponse } from "next/server";
import { validateSymbol, checkRateLimit } from "@/lib/api-utils";
import { getTechnicalSnapshot, getTrendSignal, round2 } from "@/lib/analysis-engine";

// Server-side quote + analysis proxy
// GET /api/quotes?symbols=VOO,QQQ,MSFT&analyze=true

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbols = request.nextUrl.searchParams.get("symbols");
  const analyze = request.nextUrl.searchParams.get("analyze") === "true";

  if (!symbols) {
    return NextResponse.json({ error: "symbols param required" }, { status: 400 });
  }

  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase()).filter((s) => s && validateSymbol(s));
  if (tickers.length === 0) {
    return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  }
  if (tickers.length > 20) {
    return NextResponse.json({ error: "max 20 symbols" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  await Promise.all(
    tickers.map(async (symbol) => {
      try {
        // Always fetch 1y for SMA calculations; derive daily change from last 2 data points
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return;

        const meta = result.meta;
        const price = meta.regularMarketPrice ?? 0;

        // Calculate daily change from the last 2 closing prices (NOT chartPreviousClose which is range-start)
        const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: number | null) => c != null);
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        const entry: Record<string, unknown> = {
          symbol,
          name: meta.longName ?? meta.shortName ?? symbol,
          price: round2(price),
          change: round2(change),
          changePercent: round2(changePercent),
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
          fiftyDayAverage: meta.fiftyDayAverage ?? 0,
          twoHundredDayAverage: meta.twoHundredDayAverage ?? 0,
        };

        if (analyze) {
          const ohlcv = result.indicators?.quote?.[0] ?? {};
          const closes: number[] = (ohlcv.close ?? []).filter((c: number | null) => c != null);
          const snapshot = getTechnicalSnapshot(closes);
          const { signal, reason, buyAt } = getTrendSignal(price, snapshot);

          entry.ma5 = round2(snapshot.ma5);
          entry.ma10 = round2(snapshot.ma10);
          entry.ma20 = round2(snapshot.ma20);
          entry.ma60 = round2(snapshot.ma60);
          entry.sma50 = round2(snapshot.sma50);
          entry.sma150 = round2(snapshot.sma150);
          entry.sma200 = round2(snapshot.sma200);
          entry.rsi = Math.round(snapshot.rsi);
          entry.signal = signal;
          entry.reason = reason;
          entry.buyAt = buyAt;
        }

        results[symbol] = entry;
      } catch {
        // Skip failed
      }
    })
  );

  return NextResponse.json(results);
}
