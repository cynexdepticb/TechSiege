import { requirePool } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/adminAuth";
import { ok, route } from "@/lib/server/http";

/**
 * GET /api/admin/registrations?status=PAYMENT_PENDING
 * Payment-verification queue for Ops. One row per team with member / ticket /
 * check-in counts, screenshot presence and email state — the columns behind
 * the | Team | Leader | Members | Payment | Submitted | Status | Action | table.
 */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const pool = requirePool();

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "").trim();

  const params: string[] = [];
  // PENDING = the verification queue: unpaid teams plus anything awaiting review.
  const where =
    status === "PENDING"
      ? `WHERE t.payment_status = 'PENDING' OR t.registration_status IN ('PAYMENT_PENDING','PAYMENT_VERIFICATION')`
      : status && status !== "ALL"
        ? `WHERE t.registration_status = $${params.push(status)}`
        : "";

  const { rows } = await pool.query(
    `SELECT t.id, t.team_code, t.team_name, t.institution, t.city, t.track_id,
            t.project_idea, t.registration_status, t.payment_status,
            t.payment_reference,
            (t.payment_screenshot_path <> '') AS screenshot_present,
            t.submitted_at, t.verified_at, t.verified_by, t.rejection_reason,
            t.confirmation_email_status, t.created_at,
            COUNT(DISTINCT m.id)::int AS member_count,
            MAX(m.full_name) FILTER (WHERE m.is_lead) AS lead_name,
            MAX(m.email)    FILTER (WHERE m.is_lead) AS lead_email,
            MAX(m.phone)    FILTER (WHERE m.is_lead) AS lead_phone,
            COUNT(DISTINCT k.id)::int AS ticket_count,
            COUNT(DISTINCT k.id) FILTER (WHERE k.ticket_status = 'CHECKED_IN')::int AS checked_in_count
     FROM public.teams t
     LEFT JOIN public.members m ON m.team_id = t.id
     LEFT JOIN public.tickets k ON k.team_id = t.id
     ${where}
     GROUP BY t.id
     ORDER BY t.submitted_at DESC
     LIMIT 200`,
    params,
  );
  return ok({ registrations: rows });
});
