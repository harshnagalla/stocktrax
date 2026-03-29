"use client";

import { useMemo, useState, useCallback } from "react";
import { createFMPClient, type FMPClient } from "@/lib/fmp/client";
import { createMockFMPClient } from "@/lib/fmp/mock-client";

interface UseFMPClientReturn {
  client: FMPClient;
  requestCount: number;
  updateRequestCount: () => void;
  isDemo: boolean;
}

export function useFMPClient(apiKey: string): UseFMPClientReturn {
  const [requestCount, setRequestCount] = useState(0);

  const isDemo = !apiKey;

  const client = useMemo(() => {
    if (!apiKey) return createMockFMPClient();
    return createFMPClient(apiKey);
  }, [apiKey]);

  const updateRequestCount = useCallback(() => {
    setRequestCount(client.getRequestCount());
  }, [client]);

  return { client, requestCount, updateRequestCount, isDemo };
}
