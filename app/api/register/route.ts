import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { MAX_TEAMS } from "@/lib/tracks";
import { SITE } from "@/lib/content";
import { UNIQUE_VIOLATION, requirePool } from "@/lib/server/db";
import { HttpError } from "@/lib/server/errors";
import { fail, ok, readJson, route } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { forwardRegistration } from "@/lib/server/ops";
import { registerSchema } from "@/lib/server/validation";
import { newTeamCode } from "@/lib/server/codes";
import { storePaymentScreenshot } from "@/lib/server/paymentFiles";
import { acknowledgementEmail, sendMail } from "@/lib/server/mail";

/**
 * POST /api/register — register a team of 2–4 with payment proof.
 *
 * Accepts multipart/form-data (form fields + `screenshot` file) from the
 * registration page. The screenshot is REQUIRED: without it there is nothing
 * for Ops to verify.
 *
 * Stored state: payment_status=PENDING, registration_status=PAYMENT_PENDING.
 * NO tickets are generated here — that happens only in the admin verify
 * action after payment approval. The leader gets an acknowledgement email
 * (best-effort); a mail failure never rolls back the stored registration.
 */
export const POST = route(async (req) => {
  await rateLimit({ windowMs: 60_000, max: 30 })(req);

  const contentType = req.headers.get("content-type") ?? "";
  let raw: Record<string, unknown>;
  let screenshot: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("screenshot");
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, "Payment screenshot is required. Pay via the QR code, then upload the receipt.");
    }
    screenshot = file;
    let members: unknown = [];
    try {
      members = JSON.parse(String(form.get("members") ?? "[]"));
    } catch {
      return fail(400, "Invalid members data.");
    }
    raw = {
      teamName: String(form.get("teamName") ?? ""),
      institution: String(form.get("institution") ?? ""),
      city: String(form.get("city") ?? ""),
      trackId: String(form.get("trackId") ?? ""),
      projectIdea: String(form.get("projectIdea") ?? ""),
      paymentReference: String(form.get("paymentReference") ?? ""),
      members,
      agreeRules: form.get("agreeRules") === "true" || form.get("agreeRules") === "on",
    };
  } else {
    // Legacy JSON path (no file possible) — point callers at the form.
    const body = await readJson(req);
    void body;
    return fail(
      400,
      "Payment screenshot is required. Please register through the /register form and upload your payment receipt.",
    );
  }

  const data = registerSchema.parse(raw);
  const pool = requirePool();

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM public.teams");
  if (rows[0]!.n >= MAX_TEAMS) {
    throw new HttpError(409, "All team slots are filled. Join the waitlist via cynex.depticb@gmail.com.");
  }

  // Team id is minted here so the screenshot path is known before the insert.
  const teamId = randomUUID();
  const stored = await storePaymentScreenshot(teamId, screenshot).catch((e: unknown) => {
    throw new HttpError(400, e instanceof Error ? e.message : "Invalid payment screenshot.");
  });

  // Unique human-facing reference, e.g. TSG-7KQZ. Retry on collision.
  let teamCode = "";
  for (let i = 0; i < 5 && !teamCode; i++) {
    const candidate = newTeamCode();
    const clash = await pool.query("SELECT 1 FROM public.teams WHERE team_code = $1", [candidate]);
    if (clash.rows.length === 0) teamCode = candidate;
  }
  if (!teamCode) {
    await unlink(path.join(process.cwd(), stored.relativePath)).catch(() => {});
    throw new HttpError(503, "Could not issue a reference ID. Please try again.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public.teams
         (id, team_code, team_name, institution, city, track_id, project_idea,
          payment_reference, payment_screenshot_path, payment_screenshot_mime,
          payment_screenshot_size, registration_status, payment_status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PAYMENT_PENDING','PENDING',now())`,
      [
        teamId, teamCode, data.teamName, data.institution, data.city,
        data.trackId, data.projectIdea, data.paymentReference,
        stored.relativePath, stored.mime, stored.size,
      ],
    );

    for (const [i, m] of data.members.entries()) {
      await client.query(
        `INSERT INTO public.members (team_id, is_lead, full_name, email, phone, branch_year)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [teamId, i === 0, m.fullName, m.email, m.phone, m.branchYear],
      );
    }
    await client.query("COMMIT");
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    await unlink(path.join(process.cwd(), stored.relativePath)).catch(() => {});
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === UNIQUE_VIOLATION) {
      return fail(409, "One of these emails is already registered with another team.");
    }
    throw e;
  } finally {
    client.release();
  }

  /* Acknowledgement email to the TEAM LEADER only (spec step 9). Best-effort:
     a mail outage must not roll back a stored registration. The outcome is
     recorded so /admin can show it and the leader sees an honest message. */
  const lead = data.members[0]!;
  const firstName = lead.fullName.trim().split(/\s+/)[0] || "there";
  const ack = acknowledgementEmail({ teamName: data.teamName, teamCode, leaderName: firstName });
  const acked = await sendMail({ to: lead.email, subject: ack.subject, html: ack.html });
  await pool
    .query("UPDATE public.teams SET confirmation_email_status = $1 WHERE id = $2", [
      acked.status === "SENT" ? "ACK_SENT" : "ACK_FAILED",
      teamId,
    ])
    .catch((e) => console.error("[register] ack status update failed", e));

  /* Existing ops forwarding (team codes, check-in QR, per-member mail over
     there). Best-effort as before; the local row is the source of truth for
     the payment workflow regardless. */
  const forwarded = await forwardRegistration(teamId, data);
  if (!forwarded.ok) {
    console.error(`[register] team ${teamId} stored but not forwarded to ops: ${forwarded.reason}`);
  }

  return ok(
    {
      teamId,
      teamCode,
      teamName: data.teamName,
      registrationStatus: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
      acknowledged: acked.status === "SENT",
      ackEmailed: acked.status === "SENT",
      emailNotice:
        acked.status === "SENT"
          ? null
          : "Registration saved. The acknowledgement email could not be sent — the Ops team will still verify your payment.",
      venue: SITE.venue,
      dates: SITE.datesDisplay,
    },
    201,
  );
});
