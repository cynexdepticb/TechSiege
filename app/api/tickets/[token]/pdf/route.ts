import { requirePool } from "@/lib/server/db";
import { fail, route } from "@/lib/server/http";
import {
  readTicketPdf,
  renderTicketPdf,
  storeTicketPdf,
  ticketPdfExists,
  ticketPdfFilename,
} from "@/lib/server/ticketPdf";
import { ticketQrContent } from "@/lib/server/tickets";
import { SITE } from "@/lib/content";

/**
 * GET /api/tickets/[token]/pdf
 *
 * Public token-authorized PDF ticket download/preview for participants.
 * [token] is the member's secure 256-bit qr_token.
 */
export const GET = route(async (req, ctx: { params: { token: string } }) => {
  const pool = requirePool();
  const rawToken = ctx.params.token.replace(/^TECHSIEGE:TICKET:/i, "").trim();

  const res = await pool.query(
    `SELECT k.id, k.ticket_id, k.team_id, k.qr_token, k.ticket_status,
            k.pdf_path, k.pdf_filename, k.pdf_status,
            m.full_name AS member_name,
            t.team_name, t.institution, t.track_id
     FROM public.tickets k
     JOIN public.members m ON m.id = k.member_id
     JOIN public.teams t ON t.id = k.team_id
     WHERE k.qr_token = $1 OR k.ticket_id = $1`,
    [rawToken],
  );

  if (res.rows.length === 0) {
    return fail(404, "Ticket not found.");
  }

  const row = res.rows[0];
  if (row.ticket_status === "CANCELLED") {
    return fail(410, "This ticket has been cancelled.");
  }

  const filename = row.pdf_filename || ticketPdfFilename(row.member_name);

  let pdfBuf: Buffer | null = null;
  if (row.pdf_path && (await ticketPdfExists(row.pdf_path))) {
    try {
      pdfBuf = await readTicketPdf(row.pdf_path);
    } catch (e) {
      console.warn(`[ticketPdf] Failed to read cached PDF for ticket ${row.ticket_id}:`, e);
    }
  }

  if (!pdfBuf) {
    pdfBuf = await renderTicketPdf({
      ticketId: row.ticket_id,
      qrToken: ticketQrContent(row.qr_token),
      participantName: row.member_name,
      teamName: row.team_name,
      institution: row.institution,
      trackId: row.track_id,
      eventDate: SITE.datesDisplay,
      venue: SITE.venue,
    });

    const relPath = await storeTicketPdf(row.team_id, filename, pdfBuf);
    await pool.query(
      `UPDATE public.tickets
       SET pdf_filename = $1, pdf_path = $2, pdf_status = 'READY', pdf_generated_at = now(), updated_at = now()
       WHERE id = $3`,
      [filename, relPath, row.id],
    );
  }

  return new Response(new Uint8Array(pdfBuf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdfBuf.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
});
