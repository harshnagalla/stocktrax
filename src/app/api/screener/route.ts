import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-utils";
import { getCached, setCache, todayKey } from "@/lib/cache";
import { callAI } from "@/lib/ai";
import { getTechnicalSnapshot, round2, scoreScreenerSetup } from "@/lib/analysis-engine";

// Top S&P 500 stocks by sector — curated for Adam Khoo's methodology
// Excludes defensive/overvalued sectors (WMT, KO, PEP, COST per his advice)
const SCREEN_TICKERS = [
  // Tech — Software & Cloud
  "MSFT", "AAPL", "GOOG", "META", "AMZN", "NVDA", "CRM", "ADBE", "NOW", "INTU",
  "PLTR", "PANW", "CRWD", "FTNT", "SNOW", "DDOG", "NET", "ZS", "TEAM", "HUBS",
  // Semiconductors
  "AMD", "AVGO", "QCOM", "MRVL", "LRCX", "KLAC", "AMAT", "MU", "TXN", "ADI",
  // Payments & Fintech
  "V", "MA", "PYPL", "SQ", "SPGI", "ICE", "FIS", "GPN",
  // Healthcare
  "UNH", "ISRG", "TMO", "DHR", "ABT", "SYK", "BSX", "MDT", "ELV", "CI",
  // Consumer & Internet
  "NFLX", "UBER", "BKNG", "ABNB", "SHOP", "MELI", "LULU", "NKE",
  // Industrial Tech
  "CAT", "DE", "GE", "HON", "LMT", "RTX",
];

interface ScreenResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  sma50: number;
  sma150: number;
  sma200: number;
  rsi: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  score: number; // Adam Khoo composite score
  signal: string;
  reason: string;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const results: ScreenResult[] = [];

  // Fetch in batches of 10 to avoid overwhelming Yahoo
  const batchSize = 10;
  for (let i = 0; i < SCREEN_TICKERS.length; i += batchSize) {
    const batch = SCREEN_TICKERS.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
            { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } } // cache 1hr
          );
          if (!res.ok) return;
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (!result) return;

          const meta = result.meta;
          const ohlcv = result.indicators?.quote?.[0] ?? {};
          const closes: number[] = (ohlcv.close ?? []).filter((c: number | null) => c != null);
          if (closes.length < 200) return;

          const price = meta.regularMarketPrice ?? 0;
          const prev = closes.length >= 2 ? closes[closes.length - 2] : price;
          const changePercent = prev > 0 ? ((price - prev) / prev) * 100 : 0;

          const snapshot = getTechnicalSnapshot(closes);
          const { score, signal, reasons } = scoreScreenerSetup(
            price,
            snapshot,
            meta.fiftyTwoWeekLow ?? 0,
            meta.fiftyTwoWeekHigh ?? 0
          );

          results.push({
            symbol,
            name: meta.longName ?? meta.shortName ?? symbol,
            price: round2(price),
            changePercent: round2(changePercent),
            ma5: round2(snapshot.ma5),
            ma10: round2(snapshot.ma10),
            ma20: round2(snapshot.ma20),
            ma60: round2(snapshot.ma60),
            sma50: round2(snapshot.sma50),
            sma150: round2(snapshot.sma150),
            sma200: round2(snapshot.sma200),
            rsi: Math.round(snapshot.rsi),
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
            score,
            signal,
            reason: reasons.join(". "),
          });
        } catch { /* skip */ }
      })
    );
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Run AI deep analysis on top 15 stocks
  const cacheKey = `screener-ai:${todayKey()}`;
  let aiData: Record<string, { analysis: string; fundamentalScore: number; moatScore: number; targetUpside: number }> = {};

  const cached = await getCached<typeof aiData>(cacheKey);
  if (cached) {
    aiData = cached;
  } else if (process.env.DEEPSEEK_API_KEY) {
    const top15 = results.slice(0, 15);
    const summaries = top15.map((s) =>
      `${s.symbol}(${s.name}): $${s.price}, ${s.changePercent}%, RSI ${s.rsi}, 50SMA $${s.sma50.toFixed(0)}, Score ${s.score}`
    ).join("\n");

    try {
      const text = await callAI(
        `Analyze these top 15 screened stocks. For each, give: fundamentalScore (0-100 based on moat, growth, competitive position), moatScore (1-5), targetUpside (% to intrinsic value), analysis (one line: moat type + why it's a good/bad pick now).\n\n${summaries}\n\nReturn ONLY valid JSON: {"MSFT":{"fundamentalScore":90,"moatScore":5,"targetUpside":40,"analysis":"Wide moat via cloud+enterprise. Sentiment drop = opportunity."}}`,
        { temperature: 0.3, maxOutputTokens: 4000 }
      );
      try { aiData = JSON.parse(text); } catch { /* skip */ }
      if (Object.keys(aiData).length > 0) await setCache(cacheKey, aiData);
    } catch { /* AI failed, continue with technical-only results */ }
  }

  // Merge AI data into results
  const enriched = results.map((r) => {
    const ai = aiData[r.symbol];
    if (ai) {
      return { ...r, analysis: ai.analysis, fundamentalScore: ai.fundamentalScore, moatScore: ai.moatScore, targetUpside: ai.targetUpside };
    }
    return r;
  });

  return NextResponse.json({
    total: enriched.length,
    strongBuys: enriched.filter((r) => r.signal === "STRONG BUY").length,
    buys: enriched.filter((r) => r.signal === "BUY").length,
    results: enriched,
  });
}
