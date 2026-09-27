import { SITE } from "@/lib/content";
import { requirePool } from "@/lib/server/db";
import { requireAdmin, adminIdentity } from "@/lib/server/adminAuth";
import { fail, ok, route } from "@/lib/server/http";
import { confirmationEmail, sendMail } from "@/lib/server/mail";
import { ensureTicketPdfsForTeam, type GeneratedTicket } from "@/lib/server/tickets";
import { ticketPdfFilename } from "@/lib/server/ticketPdf";

/**
 * POST /api/admin/registrations/[id]/resend — re-send confirmation + PDF tickets.
 *
 * Only for CONFIRMED teams. Idempotent: re-sending never creates new tickets
 * or QR tokens, it reuses the existing tickets and existing PDF files on disk.
 * Used when confirmation_email_status = FAILED or upon organizer request.
 */
export const POST = route(async (req, ctx: { params: { id: string } }) => {
  await requireAdmin(req);
  const pool = requirePool();
  const { id } = ctx.params;
  const admin = adminIdentity(req);

  const team = await pool.query(
    `SELECT id, team_name, team_code, institution, track_id, registration_status, payment_status
     FROM public.teams WHERE id = $1`,
    [id],
  );
  if (team.rows.length === 0) return fail(404, "Registration not found.");
  const t = team.rows[0];
  if (t.registration_status !== "CONFIRMED" || t.payment_status !== "VERIFIED") {
    return fail(409, "Only confirmed registrations can receive tickets. Verify payment first.");
  }

  const ticketRows = await pool.query(
    `SELECT k.id, k.ticket_id, k.qr_token, k.ticket_status, k.pdf_path, k.pdf_filename, k.pdf_status,
            m.id AS member_id, m.full_name, m.email, m.is_lead
     FROM public.tickets k
     JOIN public.members m ON m.id = k.member_id
     WHERE k.team_id = $1 AND k.ticket_status <> 'CANCELLED'
     ORDER BY m.is_lead DESC, m.created_at ASC`,
    [id],
  );

  if (ticketRows.rows.length === 0) {
    return fail(422, "No usable tickets for this team. Re-verify payment to regenerate.");
  }

  const tickets: GeneratedTicket[] = ticketRows.rows.map((r) => ({
    id: r.id,
    ticketId: r.ticket_id,
    memberId: r.member_id,
    memberName: r.full_name,
    memberEmail: r.email,
    qrToken: r.qr_token,
    ticketStatus: r.ticket_status,
    pdfPath: r.pdf_path ?? "",
    pdfFilename: r.pdf_filename ?? "",
    pdfStatus: r.pdf_status ?? "PENDING",
  }));

  const lead = ticketRows.rows.find((r) => r.is_lead && r.email) ?? ticketRows.rows.find((r) => r.email) ?? ticketRows.rows[0];

  // Reuses the exact existing PDF ticket files on disk
  const pdfAttachments = await ensureTicketPdfsForTeam(
    pool,
    id,
    {
      teamName: t.team_name,
      institution: t.institution,
      trackId: t.track_id,
      venue: SITE.venue,
      eventDate: SITE.datesDisplay,
    },
    tickets,
  );

  const leadFirstName = lead.full_name.trim().split(/\s+/)[0] || "there";
  const mail = confirmationEmail({
    teamName: t.team_name,
    teamCode: t.team_code,
    leaderName: leadFirstName,
    members: tickets.map((tk) => ({
      name: tk.memberName,
      ticketId: tk.ticketId,
      pdfFilename: tk.pdfFilename || ticketPdfFilename(tk.memberName),
    })),
    venue: SITE.venue,
    dates: SITE.datesDisplay,
  });

  const result = await sendMail({
    to: lead.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: pdfAttachments,
  });

  await pool.query(
    `UPDATE public.teams SET confirmation_email_status = $1 WHERE id = $2`,
    [result.status === "SENT" ? "SENT" : "FAILED", id],
  );

  await pool.query(
    `INSERT INTO public.payment_decisions (team_id, decision, reason, admin_identity)
     VALUES ($1,'CONFIRMATION_RESENT',$2,$3)`,
    [
      id,
      result.status === "SENT"
        ? `confirmation email re-sent with ${pdfAttachments.length} PDF attachments`
        : `resend failed: ${result.error ?? "SMTP error"}`,
      admin,
    ],
  );

  if (result.status !== "SENT") {
    return fail(502, `Email delivery failed: ${result.error ?? "SMTP error"}`);
  }

  return ok({ emailed: 1, pdfCount: pdfAttachments.length });
});
