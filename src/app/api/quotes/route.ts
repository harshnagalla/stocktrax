import { NextRequest, NextResponse } from "next/server";
import { validateSymbol, checkRateLimit } from "@/lib/api-utils";

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

  const aboveSma50 = price > sma50;
  const aboveSma150 = price > sma150;
  const aboveSma200 = price > sma200;
  const sma50Above150 = sma50 > sma150;

  // How far price is from 50 SMA (negative = below)
  const distFromSma50 = ((price - sma50) / sma50) * 100;
  // How far price is from 150 SMA
  const distFromSma150 = ((price - sma150) / sma150) * 100;

  // === STRONG BUY: Price pulled back INTO support in an uptrend ===
  // Backtest showed: buying DURING pullbacks (not during uptrend confirmation) works
  // Price below 50 SMA but above 150 SMA, RSI oversold, uptrend structure intact
  if (aboveSma150 && sma50Above150 && !aboveSma50 && rsi < 35) {
    return {
      signal: "BUY",
      reason: `Pullback to support with RSI oversold (${rsi}). Price below 50 SMA ($${sma50.toFixed(0)}) but uptrend intact. Best entry zone.`,
      buyAt: Math.round(price),
    };
  }

  // === BUY: Price near 150 SMA support, deep pullback in longer-term uptrend ===
  if (aboveSma200 && sma50Above150 && distFromSma150 < 3 && rsi < 40) {
    return {
      signal: "BUY",
      reason: `Deep pullback near 150 SMA support ($${sma150.toFixed(0)}). RSI ${rsi} approaching oversold. Strong entry if uptrend holds.`,
      buyAt: Math.round(sma150),
    };
  }

  // === ACCUMULATE: Transition zone (50 crossing 150) — backtest showed +10.45% avg return ===
  // This was previously WATCH but backtest proved it's the best buy zone
  if (aboveSma200 && !sma50Above150 && rsi < 45) {
    return {
      signal: "BUY",
      reason: `Early recovery zone. Above 200 SMA, trend transitioning. Backtest shows strongest returns from this setup. Start small position.`,
      buyAt: Math.round(sma200),
    };
  }

  // === HOLD: Uptrend intact, price well above 50 SMA — don't buy here ===
  if (aboveSma50 && sma50Above150 && distFromSma50 > 5) {
    return {
      signal: "HOLD",
      reason: `Uptrend intact but price ${distFromSma50.toFixed(0)}% above 50 SMA. Too extended to buy. Wait for pullback to $${sma50.toFixed(0)}.`,
      buyAt: Math.round(sma50),
    };
  }

  // === HOLD: Uptrend, near 50 SMA but RSI not oversold — decent but not ideal ===
  if (aboveSma150 && sma50Above150) {
    return {
      signal: "HOLD",
      reason: `Uptrend with 50 SMA ($${sma50.toFixed(0)}) > 150 SMA. RSI ${rsi} neutral. Hold, add on pullbacks below 50 SMA.`,
      buyAt: Math.round(sma50),
    };
  }

  // === WATCH: Below 200 SMA but not in full downtrend yet ===
  if (!aboveSma200 && sma50Above150) {
    return {
      signal: "WATCH",
      reason: `Below 200 SMA ($${sma200.toFixed(0)}) but 50>150 still intact. Correction may deepen. Wait for price to reclaim 200 SMA.`,
      buyAt: Math.round(sma200),
    };
  }

  // === SELL: Clear downtrend — 50 < 150 AND below 200 SMA ===
  // Backtest showed SELL fired too late. Now fires earlier: below 150 SMA with 50 turning down
  if (!aboveSma150 && !sma50Above150) {
    return {
      signal: "SELL",
      reason: `Downtrend. Price below 150 SMA ($${sma150.toFixed(0)}), 50 SMA crossed below 150. Cut losses and redeploy to stronger stocks.`,
      buyAt: null,
    };
  }

  // === WATCH: Transition zone with RSI not oversold — wait ===
  if (aboveSma200 && !sma50Above150 && rsi >= 45) {
    return {
      signal: "WATCH",
      reason: `Transitioning. Above 200 SMA but 50 crossing below 150. RSI ${rsi} not oversold yet. Wait for RSI < 40 for better entry.`,
      buyAt: Math.round(sma200),
    };
  }

  return { signal: "HOLD", reason: `Mixed signals. RSI ${rsi}. Monitor for clearer trend.`, buyAt: null };
}

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
