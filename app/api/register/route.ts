import { MAX_TEAMS } from "@/lib/tracks";
import { UNIQUE_VIOLATION, requirePool } from "@/lib/server/db";
import { HttpError } from "@/lib/server/errors";
import { fail, ok, readJson, route } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { registerSchema } from "@/lib/server/validation";

/** POST /api/register — register a team of 2–4. */
export const POST = route(async (req) => {
  await rateLimit({ windowMs: 60_000, max: 30 })(req);

  const data = registerSchema.parse(await readJson(req));
  const pool = requirePool();

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM teams");
  if (rows[0]!.n >= MAX_TEAMS) {
    throw new HttpError(409, "All team slots are filled. Join the waitlist via cynex.depticb@gmail.com.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const team = await client.query(
      `INSERT INTO teams (team_name, institution, city, track_id, project_idea)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [data.teamName, data.institution, data.city, data.trackId, data.projectIdea],
    );
    const teamId: string = team.rows[0].id;

    for (const [i, m] of data.members.entries()) {
      await client.query(
        `INSERT INTO members (team_id, is_lead, full_name, email, phone, branch_year)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [teamId, i === 0, m.fullName, m.email, m.phone, m.branchYear],
      );
    }

    await client.query("COMMIT");
    return ok({ teamId, teamName: data.teamName }, 201);
  } catch (e: unknown) {
    await client.query("ROLLBACK");

    if (typeof e === "object" && e !== null && (e as { code?: string }).code === UNIQUE_VIOLATION) {
      return fail(409, "One of these emails is already registered with another team.");
    }
    throw e;
  } finally {
    client.release();
  }
});
