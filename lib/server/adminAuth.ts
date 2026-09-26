import { timingSafeEqual } from "node:crypto";
import { HttpError } from "./errors";

/**
 * Bearer-token gate for the organizer endpoints. The token lives in
 * `ADMIN_TOKEN` and is typed into the browser by an organizer, kept in
 * sessionStorage for that tab only — it is never bundled into the client.
 *
 * Timing-safe compare: a byte-by-byte `===` would leak the token through
 * response latency.
 */
export async function requireAdmin(req: Request): Promise<void> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    throw new HttpError(503, "Admin access is not configured (ADMIN_TOKEN missing).");
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  const valid = a.length === b.length && timingSafeEqual(a, b);

  if (!valid) {
    throw new HttpError(401, "Invalid access token.");
  }
}
