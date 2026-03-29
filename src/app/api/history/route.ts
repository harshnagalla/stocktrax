import { NextRequest, NextResponse } from "next/server";

// Server-side historical price proxy
// GET /api/history?symbol=MSFT&range=1y

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const range = request.nextUrl.searchParams.get("range") ?? "1y";

  if (!symbol) {
    return NextResponse.json({ error: "symbol param required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Yahoo Finance unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: "No data for symbol" }, { status: 404 });
    }

    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0] ?? {};

    const prices = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      open: Math.round((ohlcv.open?.[i] ?? 0) * 100) / 100,
      high: Math.round((ohlcv.high?.[i] ?? 0) * 100) / 100,
      low: Math.round((ohlcv.low?.[i] ?? 0) * 100) / 100,
      close: Math.round((ohlcv.close?.[i] ?? 0) * 100) / 100,
      volume: ohlcv.volume?.[i] ?? 0,
    }));

    return NextResponse.json({ symbol, prices });
  } catch {
    // Fallback to Twelve Data
    const tdKey = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
    if (tdKey) {
      try {
        const res = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=250&apikey=${tdKey}`
        );
        const data = await res.json();
        if (data.status === "error") {
          return NextResponse.json({ error: data.message }, { status: 502 });
        }
        const prices = (data.values ?? []).map((v: Record<string, string>) => ({
          date: v.datetime,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: parseInt(v.volume),
        }));
        return NextResponse.json({ symbol, prices });
      } catch {
        return NextResponse.json({ error: "All data sources failed" }, { status: 502 });
      }
    }

    return NextResponse.json({ error: "Yahoo Finance unavailable" }, { status: 502 });
  }
}
