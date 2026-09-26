import { HttpError } from "./errors";

/**
 * Fixed-window in-memory rate limiter, replacing the Express middleware.
 *
 * Cached on `globalThis` so the dev server's module reloading doesn't reset
 * everyone's counters, and swept on every call so the map can't grow without
 * bound the way the original `Map<string, number[]>` did.
 *
 * Scope it honestly: state is per-instance. On a single Node server this is
 * accurate; on serverless each cold instance keeps its own counters, so treat
 * this as a cheap guard against a runaway client rather than a security
 * boundary. A shared limit needs Redis or an edge/WAF rule.
 */
const globalForLimit = globalThis as unknown as { __techsiegeHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (globalForLimit.__techsiegeHits ??= new Map<string, number[]>());

/** Best-effort client IP from the proxy headers a deployed Next server sets. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  return async (req: Request): Promise<void> => {
    const key = clientIp(req);
    const now = Date.now();
    const window = now - windowMs;

    const seen = (hits.get(key) ?? []).filter((t) => t > window);

    // Sweep expired windows for other keys too, so idle clients don't leak.
    if (hits.size > 1000) {
      for (const [k, arr] of hits) {
        if (!arr.some((t) => t > window)) hits.delete(k);
      }
    }

    seen.push(now);
    hits.set(key, seen);

    if (seen.length > max) {
      throw new HttpError(429, "Too many requests, slow down.");
    }
  };
}
