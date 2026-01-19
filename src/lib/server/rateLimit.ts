/**
 * Simple in-memory rate limiter for API routes
 * Tracks requests per key (e.g., companyId or userId) with time windows
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store (clears on server restart)
// In production, consider using Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., companyId or userId)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false otherwise
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000 // 1 minute default
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // No entry or expired entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { limited: false, remaining: maxRequests - 1, resetAt };
  }

  // Entry exists and not expired
  if (entry.count >= maxRequests) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment count
  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}
