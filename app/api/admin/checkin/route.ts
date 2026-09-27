import { z } from "zod";
import { requirePool } from "@/lib/server/db";
import { adminIdentity, requireAdmin } from "@/lib/server/adminAuth";
import { fail, ok, readJson, route } from "@/lib/server/http";

/**
 * POST /api/admin/checkin — event-day scan.
 * Body: { token } where token is a ticket qr_token (scanned) or ticket_id (typed).
 *
 * Admin-only so participants can never mark themselves checked in. Idempotent:
 * scanning an already-checked-in ticket returns duplicate:true, not an error.
 */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const pool = requirePool();
  const raw = z.object({ token: z.string().trim().min(4).max(128) }).parse(await readJson(req));
  const cleanToken = raw.token.replace(/^TECHSIEGE:TICKET:/i, "").trim();
  const admin = adminIdentity(req);

  const found = await pool.query(
    `SELECT k.id, k.ticket_id, k.ticket_status, m.full_name, t.team_name, t.team_code
     FROM public.tickets k
     JOIN public.members m ON m.id = k.member_id
     JOIN public.teams t ON t.id = k.team_id
     WHERE k.qr_token = $1 OR k.qr_token = $2 OR k.ticket_id = $1 OR k.ticket_id = $2`,
    [raw.token, cleanToken],
  );
  if (found.rows.length === 0) return fail(404, "Unknown ticket. Check the code and try again.");
  const k = found.rows[0];
  if (k.ticket_status === "CANCELLED") return fail(409, "This ticket was cancelled.");
  if (k.ticket_status === "CHECKED_IN") {
    return ok({ duplicate: true, ticketId: k.ticket_id, memberName: k.full_name, teamName: k.team_name });
  }
  await pool.query(
    `UPDATE public.tickets SET ticket_status = 'CHECKED_IN', checked_in_at = now(), checked_in_by = $1, updated_at = now()
     WHERE id = $2`,
    [admin, k.id],
  );
  return ok({ ticketId: k.ticket_id, memberName: k.full_name, teamName: k.team_name, teamCode: k.team_code });
});
