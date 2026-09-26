import { Pool } from "pg";
import { HttpError } from "./errors";

/**
 * Lazily-created Postgres pool, or null when DATABASE_URL is unset (so the
 * marketing site still builds and serves without a database).
 *
 * The pool is cached on `globalThis` rather than in module scope: the dev server
 * re-evaluates server modules on every edit, and a module-scoped pool would leak
 * another set of 10 connections per save until Postgres refused new ones.
 */
const globalForDb = globalThis as unknown as { __techsiegePool?: Pool };

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!globalForDb.__techsiegePool) {
    const pool = new Pool({ connectionString, max: 10 });
    pool.on("error", (err) => console.error("[db] pool error", err));
    globalForDb.__techsiegePool = pool;
  }
  return globalForDb.__techsiegePool;
}

/** For routes that cannot meaningfully degrade when the database is absent. */
export function requirePool(): Pool {
  const pool = getPool();
  if (!pool) {
    throw new HttpError(503, "Registration is not open yet — please try again soon.");
  }
  return pool;
}

/** Postgres unique-violation SQLSTATE. */
export const UNIQUE_VIOLATION = "23505";
