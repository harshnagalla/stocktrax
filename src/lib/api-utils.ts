// Shared API utilities: validation, rate limiting

const SYMBOL_RE = /^[A-Z0-9^.-]{1,10}$/;
const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];

export function validateSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol.toUpperCase());
}

export function validateRange(range: string): boolean {
  return VALID_RANGES.includes(range);
}

// Simple in-memory rate limiter (per IP, resets each minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}
