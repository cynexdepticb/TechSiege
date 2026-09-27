import { requireAdmin } from "@/lib/server/adminAuth";
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
 * GET /api/admin/tickets/[id]/pdf
 *
 * Downloads or previews a member's ticket PDF directly.
 * [id] can be ticket_id (e.g. TS26-XXXXXX) or the ticket's UUID.
 *
 * If the PDF is already stored on disk, it is served directly.
 * If not yet generated, it renders the PDF, stores it to disk,
 * updates the database row, and serves it.
 */
export const GET = route(async (req, ctx: { params: { id: string } }) => {
  await requireAdmin(req);
  const pool = requirePool();
  const { id } = ctx.params;

  const res = await pool.query(
    `SELECT k.id, k.ticket_id, k.team_id, k.qr_token, k.ticket_status,
            k.pdf_path, k.pdf_filename, k.pdf_status,
            m.full_name AS member_name,
            t.team_name, t.institution, t.track_id
     FROM public.tickets k
     JOIN public.members m ON m.id = k.member_id
     JOIN public.teams t ON t.id = k.team_id
     WHERE k.id::text = $1 OR k.ticket_id = $1`,
    [id],
  );

  if (res.rows.length === 0) {
    return fail(404, "Ticket not found.");
  }

  const row = res.rows[0];
  const filename = row.pdf_filename || ticketPdfFilename(row.member_name);

  let pdfBuf: Buffer | null = null;
  if (row.pdf_path && (await ticketPdfExists(row.pdf_path))) {
    try {
      pdfBuf = await readTicketPdf(row.pdf_path);
    } catch (e) {
      console.warn(`[ticketPdf] Failed to read cached PDF for ticket ${row.ticket_id}, regenerating:`, e);
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
      "Cache-Control": "private, no-cache",
    },
  });
});
