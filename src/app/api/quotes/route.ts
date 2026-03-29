import { NextRequest, NextResponse } from "next/server";

// Server-side Yahoo Finance proxy — no CORS issues, no API keys exposed
// GET /api/quotes?symbols=VOO,QQQ,MSFT

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json({ error: "symbols param required" }, { status: 400 });
  }

  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (tickers.length === 0) {
    return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  }

  // Fetch all tickers in parallel via Yahoo chart endpoint
  const results: Record<string, unknown> = {};

  await Promise.all(
    tickers.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 }, // cache for 5 min on Vercel edge
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return;

        const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
        const price = meta.regularMarketPrice ?? 0;
        const change = price - prev;
        const changePercent = prev > 0 ? (change / prev) * 100 : 0;

        results[symbol] = {
          symbol,
          name: meta.longName ?? meta.shortName ?? symbol,
          price,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          volume: meta.regularMarketVolume ?? 0,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
          fiftyDayAverage: meta.fiftyDayAverage ?? 0,
          twoHundredDayAverage: meta.twoHundredDayAverage ?? 0,
        };
      } catch {
        // Skip failed symbols silently
      }
    })
  );

  // Fallback to Twelve Data if Yahoo fails
  if (Object.keys(results).length === 0) {
    const tdKey = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
    if (tdKey) {
      try {
        const res = await fetch(
          `https://api.twelvedata.com/quote?symbol=${tickers.join(",")}&apikey=${tdKey}`
        );
        const data = await res.json();
        // Twelve Data returns single object for 1 symbol, object of objects for multiple
        const items = tickers.length === 1 ? { [tickers[0]]: data } : data;
        for (const [sym, q] of Object.entries(items) as [string, Record<string, unknown>][]) {
          if (q.status === "error") continue;
          const ftw = q.fifty_two_week as Record<string, string> | undefined;
          results[sym] = {
            symbol: sym,
            name: (q.name as string) ?? sym,
            price: parseFloat((q.close as string) ?? "0"),
            change: parseFloat((q.change as string) ?? "0"),
            changePercent: parseFloat((q.percent_change as string) ?? "0"),
            volume: parseInt((q.volume as string) ?? "0"),
            fiftyTwoWeekLow: parseFloat(ftw?.low ?? "0"),
            fiftyTwoWeekHigh: parseFloat(ftw?.high ?? "0"),
            fiftyDayAverage: 0,
            twoHundredDayAverage: 0,
          };
        }
      } catch {
        // Twelve Data also failed
      }
    }
  }

  return NextResponse.json(results);
}
