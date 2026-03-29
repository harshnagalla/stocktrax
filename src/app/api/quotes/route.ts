import { NextRequest, NextResponse } from "next/server";

// Server-side quote + analysis proxy
// GET /api/quotes?symbols=VOO,QQQ,MSFT&analyze=true

function calcSMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(closes.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function getSignal(price: number, sma50: number, sma150: number, sma200: number, rsi: number) {
  if (sma50 === 0) return { signal: "HOLD", reason: "Not enough data", buyAt: null };

  const aboveSma200 = price > sma200;
  const sma50Above150 = sma50 > sma150;

  if (!aboveSma200 && !sma50Above150) {
    return { signal: "SELL", reason: `Downtrend. Below 200 SMA ($${sma200.toFixed(0)}).`, buyAt: null };
  }
  if (price > sma150 && sma50Above150) {
    if (rsi < 35 || price < sma50 * 1.02) {
      return { signal: "BUY", reason: `Near 50 SMA support ($${sma50.toFixed(0)}). RSI ${rsi}.`, buyAt: Math.round(sma50) };
    }
    return { signal: "HOLD", reason: `Uptrend. 50 SMA ($${sma50.toFixed(0)}) > 150 SMA.`, buyAt: null };
  }
  if (aboveSma200 && !sma50Above150) {
    return { signal: "WATCH", reason: `Transitioning. Wait for 50/150 SMA crossover.`, buyAt: Math.round(sma150) };
  }
  if (!price && price < sma50) {
    return { signal: "WATCH", reason: `Correction. Support at 150 SMA ($${sma150.toFixed(0)}).`, buyAt: Math.round(sma150) };
  }
  return { signal: "HOLD", reason: "Mixed signals.", buyAt: null };
}

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  const analyze = request.nextUrl.searchParams.get("analyze") === "true";

  if (!symbols) {
    return NextResponse.json({ error: "symbols param required" }, { status: 400 });
  }

  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (tickers.length === 0) {
    return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};
  const range = analyze ? "1y" : "5d";

  await Promise.all(
    tickers.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
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
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
        const price = meta.regularMarketPrice ?? 0;
        const change = price - prev;
        const changePercent = prev > 0 ? (change / prev) * 100 : 0;

        const entry: Record<string, unknown> = {
          symbol,
          name: meta.longName ?? meta.shortName ?? symbol,
          price: Math.round(price * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
          fiftyDayAverage: meta.fiftyDayAverage ?? 0,
          twoHundredDayAverage: meta.twoHundredDayAverage ?? 0,
        };

        if (analyze) {
          const ohlcv = result.indicators?.quote?.[0] ?? {};
          const closes: number[] = (ohlcv.close ?? []).filter((c: number | null) => c != null);
          const sma50 = calcSMA(closes, 50);
          const sma150 = calcSMA(closes, 150);
          const sma200 = calcSMA(closes, 200);
          const rsi = calcRSI(closes);
          const { signal, reason, buyAt } = getSignal(price, sma50, sma150, sma200, rsi);

          entry.sma50 = Math.round(sma50 * 100) / 100;
          entry.sma150 = Math.round(sma150 * 100) / 100;
          entry.sma200 = Math.round(sma200 * 100) / 100;
          entry.rsi = Math.round(rsi);
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
