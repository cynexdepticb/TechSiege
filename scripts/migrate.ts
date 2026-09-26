/**
 * Applies db/schema.sql to DATABASE_URL.
 * Usage: npm run db:migrate
 *
 * Uses Next's own env loader so the scripts read exactly the same files, in the
 * same precedence, as the running app — including `.env.local`, which a bare
 * `dotenv/config` would skip.
 */
import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Resolved from the app root so this works from any cwd.
    const sql = fs.readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8");
    await pool.query(sql);
    console.log("Migration complete: teams + members ready.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
