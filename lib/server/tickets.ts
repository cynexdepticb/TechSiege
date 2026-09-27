import QRCode from "qrcode";
import type { Pool, PoolClient } from "pg";
import { newQrToken, newTicketId } from "./codes";
import {
  renderTicketPdf,
  storeTicketPdf,
  readTicketPdf,
  ticketPdfExists,
  ticketPdfFilename,
} from "./ticketPdf";

/**
 * Per-member event tickets. Generated ONLY after payment verification
 * (guarded by canGenerateTickets at the call site).
 *
 * QR content is `TECHSIEGE:TICKET:<qrToken>` — opaque, non-guessable, and
 * scannable without network access. The volunteer enters/scans the token into
 * the admin check-in action, which marks the ticket CHECKED_IN.
 *
 * Generation is idempotent per member (UNIQUE on member_id): re-approving an
 * already-CONFIRMED team returns the existing tickets instead of duplicates.
 */

export const TICKET_QR_PREFIX = "TECHSIEGE:TICKET:";

export function ticketQrContent(qrToken: string): string {
  return `${TICKET_QR_PREFIX}${qrToken}`;
}

export async function ticketQrPng(qrToken: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketQrContent(qrToken), {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0e14", light: "#ffffff" },
  });
}

export async function ticketQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(ticketQrContent(qrToken), {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0e14", light: "#ffffff" },
  });
}

export type GeneratedTicket = {
  id: string;
  ticketId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  qrToken: string;
  ticketStatus: string;
  pdfPath: string;
  pdfFilename: string;
  pdfStatus: string;
};

export type TicketPdfAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

/**
 * Creates one ticket per member inside the caller's transaction.
 * Existing tickets for the team are reused (idempotent re-approve).
 */
export async function generateTicketsForTeam(
  client: PoolClient,
  teamId: string,
): Promise<GeneratedTicket[]> {
  const members = await client.query(
    `SELECT id, full_name, email FROM public.members WHERE team_id = $1 ORDER BY is_lead DESC, created_at ASC`,
    [teamId],
  );
  const out: GeneratedTicket[] = [];
  for (const m of members.rows) {
    const existing = await client.query(
      `SELECT id, ticket_id, qr_token, ticket_status, pdf_path, pdf_filename, pdf_status
       FROM public.tickets WHERE member_id = $1`,
      [m.id],
    );
    if (existing.rows.length > 0) {
      const e = existing.rows[0];
      out.push({
        id: e.id,
        ticketId: e.ticket_id,
        memberId: m.id,
        memberName: m.full_name,
        memberEmail: m.email,
        qrToken: e.qr_token,
        ticketStatus: e.ticket_status,
        pdfPath: e.pdf_path ?? "",
        pdfFilename: e.pdf_filename ?? "",
        pdfStatus: e.pdf_status ?? "PENDING",
      });
      continue;
    }
    // Retry on the (astronomically unlikely) code/token collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ins = await client.query(
          `INSERT INTO public.tickets (ticket_id, team_id, member_id, qr_token, ticket_status)
           VALUES ($1,$2,$3,$4,'GENERATED') RETURNING id`,
          [newTicketId(), teamId, m.id, newQrToken()],
        );
        const row = await client.query(
          `SELECT id, ticket_id, qr_token, ticket_status, pdf_path, pdf_filename, pdf_status
           FROM public.tickets WHERE id = $1`,
          [ins.rows[0].id],
        );
        const t = row.rows[0];
        out.push({
          id: t.id,
          ticketId: t.ticket_id,
          memberId: m.id,
          memberName: m.full_name,
          memberEmail: m.email,
          qrToken: t.qr_token,
          ticketStatus: t.ticket_status,
          pdfPath: t.pdf_path ?? "",
          pdfFilename: t.pdf_filename ?? "",
          pdfStatus: t.pdf_status ?? "PENDING",
        });
        break;
      } catch (e) {
        if (typeof e === "object" && e !== null && (e as { code?: string }).code === "23505" && attempt < 2) continue;
        throw e;
      }
    }
  }
  return out;
}

/**
 * Ensures PDF tickets are generated and stored for all tickets of a team.
 * Idempotent: If the PDF is already stored and exists on disk, it is reused
 * without regenerating or minting new tokens.
 */
export async function ensureTicketPdfsForTeam(
  poolOrClient: Pool | PoolClient,
  teamId: string,
  teamInfo: {
    teamName: string;
    institution: string;
    trackId: string;
    eventDate?: string;
    venue?: string;
  },
  tickets: GeneratedTicket[],
): Promise<TicketPdfAttachment[]> {
  const attachments: TicketPdfAttachment[] = [];

  for (const t of tickets) {
    const filename = t.pdfFilename || ticketPdfFilename(t.memberName);
    let pdfBuf: Buffer | null = null;

    // Check if valid PDF already exists on disk
    if (t.pdfPath && (await ticketPdfExists(t.pdfPath))) {
      try {
        pdfBuf = await readTicketPdf(t.pdfPath);
      } catch (err) {
        console.warn(`[ticketPdf] Could not read existing PDF at ${t.pdfPath}, will regenerate:`, err);
      }
    }

    if (!pdfBuf) {
      // Generate new PDF using existing ticketId and qrToken
      pdfBuf = await renderTicketPdf({
        ticketId: t.ticketId,
        qrToken: ticketQrContent(t.qrToken),
        participantName: t.memberName,
        teamName: teamInfo.teamName,
        institution: teamInfo.institution,
        trackId: teamInfo.trackId,
        eventDate: teamInfo.eventDate,
        venue: teamInfo.venue,
      });

      // Persist to disk
      const relativePath = await storeTicketPdf(teamId, filename, pdfBuf);

      // Update database record with PDF metadata
      await poolOrClient.query(
        `UPDATE public.tickets
         SET pdf_filename = $1, pdf_path = $2, pdf_status = 'READY', pdf_generated_at = now(), updated_at = now()
         WHERE id = $3`,
        [filename, relativePath, t.id],
      );

      t.pdfFilename = filename;
      t.pdfPath = relativePath;
      t.pdfStatus = "READY";
    }

    attachments.push({
      filename,
      content: pdfBuf,
      contentType: "application/pdf",
    });
  }

  return attachments;
}
