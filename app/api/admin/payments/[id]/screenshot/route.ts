import { requirePool } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/adminAuth";
import { fail, ok, route } from "@/lib/server/http";
import { readPaymentScreenshot } from "@/lib/server/paymentFiles";

/**
 * GET /api/admin/payments/[id]/screenshot — payment proof viewer.
 *
 * `id` is the TEAM id. Admin-only: requireAdmin rejects without the bearer
 * token, and the file is streamed from the private data/ directory — there is
 * no public URL, and the on-disk path is never exposed to any client.
 */
export const GET = route(async (req, ctx: { params: { id: string } }) => {
  await requireAdmin(req);
  const pool = requirePool();
  const { id } = ctx.params;

  const { rows } = await pool.query(
    `SELECT payment_screenshot_path FROM public.teams WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return fail(404, "Registration not found.");
  const rel: string = rows[0].payment_screenshot_path;
  if (!rel) return fail(404, "No payment screenshot on file.");

  const { buf, mime } = await readPaymentScreenshot(rel).catch(() => ({ buf: null, mime: "" }));
  if (!buf) return fail(410, "Screenshot file is missing from storage.");

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="payment-${id}.img"`,
    },
  });
});
