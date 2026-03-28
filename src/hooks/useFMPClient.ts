"use client";

import { useMemo, useState, useCallback } from "react";
import { createFMPClient, type FMPClient } from "@/lib/fmp/client";

interface UseFMPClientReturn {
  client: FMPClient | null;
  requestCount: number;
  updateRequestCount: () => void;
}

export function useFMPClient(apiKey: string): UseFMPClientReturn {
  const [requestCount, setRequestCount] = useState(0);

  const client = useMemo(() => {
    if (!apiKey) return null;
    return createFMPClient(apiKey);
  }, [apiKey]);

  const updateRequestCount = useCallback(() => {
    if (client) {
      setRequestCount(client.getRequestCount());
    }
  }, [client]);

  return { client, requestCount, updateRequestCount };
}
