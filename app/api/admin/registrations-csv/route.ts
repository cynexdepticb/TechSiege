import { TRACK_LABELS, type TrackId } from "@/lib/tracks";
import { requirePool } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/adminAuth";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const CSV_COLUMNS = [
  "team_name",
  "institution",
  "city",
  "track",
  "project_idea",
  "registered_at",
  "role",
  "full_name",
  "email",
  "phone",
  "branch_year",
] as const;

/** Quotes a value and doubles any embedded quote, per RFC 4180. */
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * GET /api/admin/registrations.csv — flat team + member rows for export.
 *
 * Served at `/api/admin/registrations.csv` via the rewrite in next.config.js:
 * the public URL is unchanged from the Express service, while the route folder
 * avoids a literal dot in a path segment.
 */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const pool = requirePool();

  const { rows } = await pool.query(
    `SELECT t.team_name, t.institution, t.city, t.track_id, t.project_idea, t.created_at,
            m.is_lead, m.full_name, m.email, m.phone, m.branch_year
     FROM teams t LEFT JOIN members m ON m.team_id = t.id
     ORDER BY t.created_at, m.is_lead DESC`,
  );

  const body = rows
    .map((r) =>
      [
        r.team_name,
        r.institution,
        r.city,
        TRACK_LABELS[r.track_id as TrackId] ?? r.track_id,
        r.project_idea,
        r.created_at,
        r.is_lead ? "lead" : "member",
        r.full_name,
        r.email,
        r.phone,
        r.branch_year,
      ]
        .map(csvCell)
        .join(","),
    )
    .join("\n");

  const filename = `cynex-registrations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(`${CSV_COLUMNS.join(",")}\n${body}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
