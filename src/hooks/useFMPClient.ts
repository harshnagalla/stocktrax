"use client";

import { useMemo, useState, useCallback } from "react";
import { createFMPClient, type FMPClient } from "@/lib/fmp/client";
import { createMockFMPClient } from "@/lib/fmp/mock-client";
import { createYahooClient } from "@/lib/yahoo/client";
import { createYahooDirectClient } from "@/lib/yahoo/direct-client";

export type ApiProvider = "yahoo-free" | "fmp" | "yahoo" | "demo";

interface UseFMPClientReturn {
  client: FMPClient;
  requestCount: number;
  updateRequestCount: () => void;
  isDemo: boolean;
  provider: ApiProvider;
}

export function useFMPClient(
  apiKey: string,
  provider: ApiProvider
): UseFMPClientReturn {
  const [requestCount, setRequestCount] = useState(0);

  const isDemo = provider === "demo";

  const client = useMemo(() => {
    if (provider === "yahoo-free") return createYahooDirectClient();
    if (provider === "yahoo" && apiKey) return createYahooClient(apiKey);
    if (provider === "fmp" && apiKey) return createFMPClient(apiKey);
    return createMockFMPClient();
  }, [apiKey, provider]);

  const updateRequestCount = useCallback(() => {
    setRequestCount(client.getRequestCount());
  }, [client]);

  return { client, requestCount, updateRequestCount, isDemo, provider };
}
