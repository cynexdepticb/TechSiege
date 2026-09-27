import { MAX_TEAMS } from "@/lib/tracks";
import { getPool } from "@/lib/server/db";
import { ok, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/teams/count — public slot counter for the registration page.
 * `configured: false` means no DATABASE_URL, which the UI can show as
 * "registration closed" rather than an error.
 */
export const GET = route(async () => {
  const pool = getPool();
  if (!pool) return ok({ teams: 0, maxTeams: MAX_TEAMS, configured: false });

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM public.teams");
  return ok({ teams: rows[0]!.n, maxTeams: MAX_TEAMS, configured: true });
});
