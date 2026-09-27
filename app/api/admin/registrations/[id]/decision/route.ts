import { z } from "zod";
import { SITE } from "@/lib/content";
import { requirePool } from "@/lib/server/db";
import { requireAdmin, adminIdentity } from "@/lib/server/adminAuth";
import { fail, ok, readJson, route } from "@/lib/server/http";
import { canGenerateTickets, decisionTarget } from "@/lib/server/registrationStatus";
import { generateTicketsForTeam, ensureTicketPdfsForTeam, type GeneratedTicket } from "@/lib/server/tickets";
import { ticketPdfFilename } from "@/lib/server/ticketPdf";
import { confirmationEmail, resubmissionEmail, sendMail } from "@/lib/server/mail";

const bodySchema = z.object({
  decision: z.enum(["VERIFY", "REJECT", "RESUBMIT"]),
  reason: z.string().trim().max(1000).optional().default(""),
});

/** Audit-log action names for payment decisions. */
function auditAction(decision: "VERIFY" | "REJECT" | "RESUBMIT"): string {
  switch (decision) {
    case "VERIFY":
      return "PAYMENT_VERIFIED";
    case "REJECT":
      return "PAYMENT_REJECTED";
    case "RESUBMIT":
      return "PAYMENT_RESUBMISSION_REQUESTED";
  }
}

/**
 * POST /api/admin/registrations/[id]/decision
 * Body: { decision: VERIFY | REJECT | RESUBMIT, reason? }
 *
 * VERIFY → CONFIRMED / VERIFIED + one ticket per member (idempotent) +
 *   generates individual PDF ticket for each member +
 *   sends ONE confirmation email with all PDF tickets as attachments.
 *   (best-effort: mail failure keeps CONFIRMED and flips confirmation_email_status
 *   to FAILED for manual resend with existing PDFs).
 * REJECT → PAYMENT_REJECTED / REJECTED (+ cancels any existing tickets).
 * RESUBMIT → RESUBMISSION_REQUIRED / PENDING (reason = what to fix).
 *
 * Every decision is recorded in payment_decisions with admin identity + timestamp.
 */
export const POST = route(async (req, ctx: { params: { id: string } }) => {
  await requireAdmin(req);
  const pool = requirePool();
  const { id } = ctx.params;
  const { decision, reason } = bodySchema.parse(await readJson(req));
  const admin = adminIdentity(req);

  if ((decision === "REJECT" || decision === "RESUBMIT") && !reason) {
    return fail(400, "A reason is required so the team knows what to fix.");
  }

  const client = await pool.connect();
  let team: Record<string, unknown>;
  let tickets: GeneratedTicket[] = [];
  let duplicate = false;

  try {
    await client.query("BEGIN");
    const cur = await client.query(`SELECT * FROM public.teams WHERE id = $1 FOR UPDATE`, [id]);
    if (cur.rows.length === 0) {
      await client.query("ROLLBACK");
      return fail(404, "Registration not found.");
    }
    team = cur.rows[0] as Record<string, unknown>;

    if (team.registration_status === "CANCELLED") {
      await client.query("ROLLBACK");
      return fail(409, "This registration is cancelled and cannot be changed.");
    }

    const target = decisionTarget(decision);

    // Idempotent re-approve: already CONFIRMED + VERIFY reuses tickets & PDFs, no dupes.
    if (decision === "VERIFY" && team.registration_status === "CONFIRMED" && team.payment_status === "VERIFIED") {
      duplicate = true;
      tickets = await generateTicketsForTeam(client, id);
      await client.query(
        `INSERT INTO public.payment_decisions (team_id, decision, reason, admin_identity)
         VALUES ($1,'PAYMENT_VERIFIED','re-approved (idempotent)', $2)`,
        [id, admin],
      );
      await client.query("COMMIT");
    } else {
      if (decision === "VERIFY") {
        if (!team.payment_screenshot_path) {
          await client.query("ROLLBACK");
          return fail(422, "No payment screenshot on file. Request resubmission instead.");
        }
        if (!canGenerateTickets(target.registrationStatus, target.paymentStatus)) {
          await client.query("ROLLBACK");
          return fail(500, "Internal status error.");
        }
      }
      await client.query(
        `UPDATE public.teams
         SET registration_status = $1, payment_status = $2,
             verified_at = now(), verified_by = $3, rejection_reason = $4, updated_at = now()
         WHERE id = $5`,
        [target.registrationStatus, target.paymentStatus, admin, decision === "VERIFY" ? "" : reason, id],
      );
      if (decision === "VERIFY") {
        tickets = await generateTicketsForTeam(client, id);
      } else if (decision === "REJECT") {
        // A rejected team must not hold usable tickets.
        await client.query(
          `UPDATE public.tickets SET ticket_status = 'CANCELLED', updated_at = now()
           WHERE team_id = $1 AND ticket_status <> 'CANCELLED'`,
          [id],
        );
      }
      await client.query(
        `INSERT INTO public.payment_decisions (team_id, decision, reason, admin_identity)
         VALUES ($1,$2,$3,$4)`,
        [id, auditAction(decision), reason, admin],
      );
      await client.query("COMMIT");
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  // Confirmation email goes out ONLY after verification, to the leader, with
  // all member tickets attached as PDF files. Best-effort: failure keeps CONFIRMED.
  let emailed = 0;
  let emailFailed: string | null = null;
  let pdfCount = 0;

  if (decision === "VERIFY" && !duplicate) {
    const teamRow = (
      await pool.query(
        `SELECT team_name, team_code, institution, track_id FROM public.teams WHERE id = $1`,
        [id],
      )
    ).rows[0];

    const leadRow = (
      await pool.query(
        `SELECT full_name, email FROM public.members WHERE team_id = $1 AND is_lead LIMIT 1`,
        [id],
      )
    ).rows[0] ?? (
      await pool.query(`SELECT full_name, email FROM public.members WHERE team_id = $1 ORDER BY created_at LIMIT 1`, [id])
    ).rows[0];

    if (!leadRow) {
      emailFailed = "No members on this team — tickets generated but no one to email.";
    } else {
      // 1. Ensure a unique PDF ticket is generated and stored for each member
      const pdfAttachments = await ensureTicketPdfsForTeam(
        pool,
        id,
        {
          teamName: teamRow.team_name,
          institution: teamRow.institution,
          trackId: teamRow.track_id,
          venue: SITE.venue,
          eventDate: SITE.datesDisplay,
        },
        tickets,
      );
      pdfCount = pdfAttachments.length;

      const leadFirstName = leadRow.full_name.trim().split(/\s+/)[0] || "there";
      const mail = confirmationEmail({
        teamName: teamRow.team_name,
        teamCode: teamRow.team_code,
        leaderName: leadFirstName,
        members: tickets.map((t) => ({
          name: t.memberName,
          ticketId: t.ticketId,
          pdfFilename: t.pdfFilename || ticketPdfFilename(t.memberName),
        })),
        venue: SITE.venue,
        dates: SITE.datesDisplay,
      });

      // 2. Send ONE email to team leader with all PDF attachments
      const result = await sendMail({
        to: leadRow.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: pdfAttachments,
      });

      if (result.status === "SENT") {
        emailed = 1;
      } else {
        emailFailed = result.error ?? "Email send failed.";
      }
    }

    await pool.query(`UPDATE public.teams SET confirmation_email_status = $1 WHERE id = $2`, [
      emailFailed ? "FAILED" : "SENT",
      id,
    ]);
  } else if (decision === "VERIFY" && duplicate) {
    pdfCount = tickets.length;
  }

  // Resubmission notice to the leader: tells them what to fix.
  let resubmitEmailed = false;
  let resubmitEmailError: string | null = null;
  if (decision === "RESUBMIT") {
    const teamRow = (
      await pool.query(`SELECT team_name, team_code FROM public.teams WHERE id = $1`, [id])
    ).rows[0];
    const leadRow = (
      await pool.query(
        `SELECT full_name, email FROM public.members WHERE team_id = $1 ORDER BY is_lead DESC, created_at ASC LIMIT 1`,
        [id],
      )
    ).rows[0];
    if (leadRow) {
      const firstName = leadRow.full_name.trim().split(/\s+/)[0] || "there";
      const mail = resubmissionEmail({
        teamName: teamRow.team_name,
        teamCode: teamRow.team_code,
        leaderName: firstName,
        reason,
      });
      const result = await sendMail({ to: leadRow.email, subject: mail.subject, html: mail.html, text: mail.text });
      if (result.status === "SENT") {
        resubmitEmailed = true;
      } else {
        resubmitEmailError = result.error ?? "Email send failed.";
      }
    } else {
      resubmitEmailError = "No members on this team — no one to notify.";
    }
  }

  return ok({
    registrationStatus: decisionTarget(decision).registrationStatus,
    paymentStatus: decisionTarget(decision).paymentStatus,
    auditAction: auditAction(decision),
    duplicate,
    tickets: tickets.map((t) => ({
      ticketId: t.ticketId,
      memberName: t.memberName,
      pdfFilename: t.pdfFilename || ticketPdfFilename(t.memberName),
    })),
    pdfCount,
    emailed,
    emailFailed,
    resubmitEmailed,
    resubmitEmailError,
  });
});
