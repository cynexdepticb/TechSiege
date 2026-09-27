import { requirePool } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/adminAuth";
import { fail, ok, route } from "@/lib/server/http";

/** GET /api/admin/registrations/[id] — full verification dossier. */
export const GET = route(async (req, ctx: { params: { id: string } }) => {
  await requireAdmin(req);
  const pool = requirePool();
  const { id } = ctx.params;

  const team = await pool.query(`SELECT * FROM public.teams WHERE id = $1`, [id]);
  if (team.rows.length === 0) return fail(404, "Registration not found.");
  const members = await pool.query(
    `SELECT m.*, k.ticket_id, k.ticket_status, k.checked_in_at, k.pdf_filename, k.pdf_status
     FROM public.members m LEFT JOIN public.tickets k ON k.member_id = m.id
     WHERE m.team_id = $1 ORDER BY m.is_lead DESC, m.created_at ASC`,
    [id],
  );
  const decisions = await pool.query(
    `SELECT decision, reason, admin_identity, created_at
     FROM public.payment_decisions WHERE team_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [id],
  );
  const t = team.rows[0];
  // Never leak the on-disk path to the client; the screenshot is fetched via
  // the dedicated admin-only binary route.
  delete t.payment_screenshot_path;
  return ok({ team: t, members: members.rows, decisions: decisions.rows });
});
