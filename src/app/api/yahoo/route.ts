import { NextRequest, NextResponse } from "next/server";

const YAHOO_BASE = "https://query1.finance.yahoo.com";

const ALLOWED_PATHS: Record<string, string> = {
  quote: "/v7/finance/quote",
  chart: "/v8/finance/chart",
  summary: "/v10/finance/quoteSummary",
  search: "/v1/finance/search",
};

/**
 * Server-side proxy for Yahoo Finance public endpoints.
 * Avoids CORS issues by making requests from the server.
 *
 * Usage: /api/yahoo?type=quote&symbols=AAPL,MSFT
 *        /api/yahoo?type=chart&symbol=AAPL&range=1y&interval=1d
 *        /api/yahoo?type=summary&symbol=AAPL&modules=financialData,defaultKeyStatistics
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");

  if (!type || !(type in ALLOWED_PATHS)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${Object.keys(ALLOWED_PATHS).join(", ")}` },
      { status: 400 }
    );
  }

  let url: string;

  switch (type) {
    case "quote": {
      const symbols = searchParams.get("symbols") ?? "";
      url = `${YAHOO_BASE}${ALLOWED_PATHS.quote}?symbols=${encodeURIComponent(symbols)}`;
      break;
    }
    case "chart": {
      const symbol = searchParams.get("symbol") ?? "";
      const range = searchParams.get("range") ?? "1y";
      const interval = searchParams.get("interval") ?? "1d";
      url = `${YAHOO_BASE}${ALLOWED_PATHS.chart}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
      break;
    }
    case "summary": {
      const symbol = searchParams.get("symbol") ?? "";
      const modules = searchParams.get("modules") ?? "financialData";
      url = `${YAHOO_BASE}${ALLOWED_PATHS.summary}/${encodeURIComponent(symbol)}?modules=${modules}`;
      break;
    }
    case "search": {
      const q = searchParams.get("q") ?? "";
      url = `${YAHOO_BASE}${ALLOWED_PATHS.search}?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 60 }, // cache for 60 seconds on the server
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Yahoo proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance" },
      { status: 502 }
    );
  }
}
