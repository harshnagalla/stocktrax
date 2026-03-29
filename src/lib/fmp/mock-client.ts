import type { FMPClient } from "./client";
import type { FMPQuote } from "../fmp/types";
import { getMockMarketData, getMockTickerData } from "../mock-data";

/**
 * Creates a demo FMPClient that returns realistic mock data.
 * Used when no API key is configured.
 */
export function createMockFMPClient(): FMPClient {
  let requestCount = 0;

  return {
    getRequestCount: () => requestCount,
    resetRequestCount: () => { requestCount = 0; },
    clearCache: () => {},
    async fetchMarketData() {
      await new Promise((r) => setTimeout(r, 600));
      requestCount += 11;
      return getMockMarketData();
    },
    async fetchTickerData(ticker: string) {
      await new Promise((r) => setTimeout(r, 400));
      requestCount += 18;
      return getMockTickerData(ticker);
    },
    async fetchBatchQuotes(tickers: string[]): Promise<FMPQuote[]> {
      await new Promise((r) => setTimeout(r, 300));
      requestCount += 1;
      return tickers.map((t) => {
        const data = getMockTickerData(t);
        return data.quote!;
      }).filter(Boolean);
    },
  };
}
