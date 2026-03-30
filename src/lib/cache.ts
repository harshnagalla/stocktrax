// Simple in-memory cache with TTL
// Persists across requests on the same serverless instance
// Resets on cold start (acceptable for daily analysis caching)

const store = new Map<string, { data: unknown; expiresAt: number }>();

const ONE_DAY = 24 * 60 * 60 * 1000;

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number = ONE_DAY): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Get today's date key for daily caching
export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}
