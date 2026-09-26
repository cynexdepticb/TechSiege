import { MAX_TEAMS, TRACK_LABELS, type TrackId } from "@/lib/tracks";
import { requirePool } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/adminAuth";
import { ok, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/stats — aggregated registration analytics for organizers. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const pool = requirePool();

  const [totals, last24h, byTrack, byInstitution, byCity, byDay, bySize, recent] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM teams)  AS teams,
         (SELECT COUNT(*)::int FROM members) AS members,
         (SELECT COUNT(DISTINCT institution)::int FROM teams) AS institutions,
         (SELECT COUNT(DISTINCT lower(email))::int FROM members) AS unique_emails,
         (SELECT COUNT(*)::int FROM members WHERE created_at > now() - interval '24 hours') AS members_last_24h`,
    ),
    pool.query(`SELECT COUNT(*)::int AS n FROM teams WHERE created_at > now() - interval '24 hours'`),
    pool.query(`SELECT track_id, COUNT(*)::int AS n FROM teams GROUP BY track_id ORDER BY n DESC`),
    pool.query(
      `SELECT institution, COUNT(*)::int AS n FROM teams GROUP BY institution ORDER BY n DESC, institution LIMIT 10`,
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(city,''),'Unknown') AS city, COUNT(*)::int AS n FROM teams GROUP BY 1 ORDER BY n DESC LIMIT 10`,
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'Mon DD') AS day,
              to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS iso,
              COUNT(*)::int AS n
       FROM teams GROUP BY 1, 2 ORDER BY 2`,
    ),
    pool.query(
      `SELECT team_size, COUNT(*)::int AS n FROM (
         SELECT t.id, COUNT(m.id)::int AS team_size
         FROM teams t LEFT JOIN members m ON m.team_id = t.id
         GROUP BY t.id
       ) s GROUP BY team_size ORDER BY team_size`,
    ),
    pool.query(
      `SELECT t.id, t.team_name, t.institution, t.city, t.track_id, t.project_idea,
              t.created_at,
              COUNT(m.id)::int AS member_count,
              MAX(m.full_name) FILTER (WHERE m.is_lead) AS lead_name,
              MAX(m.email)    FILTER (WHERE m.is_lead) AS lead_email,
              MAX(m.phone)    FILTER (WHERE m.is_lead) AS lead_phone
       FROM teams t LEFT JOIN members m ON m.team_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT 15`,
    ),
  ]);

  const t = totals.rows[0];
  const teams: number = t.teams;

  return ok({
    generatedAt: new Date().toISOString(),
    totals: {
      teams,
      members: t.members,
      institutions: t.institutions,
      uniqueEmails: t.unique_emails,
      maxTeams: MAX_TEAMS,
      slotsLeft: Math.max(0, MAX_TEAMS - teams),
      capacityPct: Math.min(100, Math.round((teams / MAX_TEAMS) * 100)),
      avgTeamSize: teams ? Number((t.members / teams).toFixed(1)) : 0,
      last24h: last24h.rows[0].n,
      membersLast24h: t.members_last_24h,
    },
    byTrack: byTrack.rows.map((r) => ({
      id: r.track_id,
      label: TRACK_LABELS[r.track_id as TrackId] ?? r.track_id,
      count: r.n,
    })),
    byInstitution: byInstitution.rows,
    byCity: byCity.rows,
    byDay: byDay.rows,
    byTeamSize: bySize.rows,
    recent: recent.rows.map((r) => ({
      ...r,
      track_label: TRACK_LABELS[r.track_id as TrackId] ?? r.track_id,
    })),
  });
});
