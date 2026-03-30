// Two-tier cache: in-memory (fast) + Firestore (persistent across deploys/users)

import { getCachedAnalysis, setCachedAnalysis } from "./firebase";

// ─── In-memory (same serverless instance) ────────────────────────
const memStore = new Map<string, { data: unknown; expiresAt: number }>();
const ONE_DAY = 24 * 60 * 60 * 1000;

function getMemCached<T>(key: string): T | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.data as T;
}

function setMemCache(key: string, data: unknown, ttlMs: number = ONE_DAY): void {
  memStore.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Public API (memory → Firestore) ─────────────────────────────

export async function getCached<T>(key: string): Promise<T | null> {
  // Try memory first (instant)
  const mem = getMemCached<T>(key);
  if (mem) return mem;

  // Try Firestore (persistent)
  try {
    const fb = await getCachedAnalysis(key);
    if (fb) {
      setMemCache(key, fb); // Warm memory cache
      return fb as T;
    }
  } catch {
    // Firestore unavailable — continue without
  }

  return null;
}

export async function setCache(key: string, data: unknown, ttlMs: number = ONE_DAY): Promise<void> {
  // Write to both
  setMemCache(key, data, ttlMs);

  try {
    await setCachedAnalysis(key, data);
  } catch {
    // Firestore write failed — memory cache still works
  }
}

export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}
