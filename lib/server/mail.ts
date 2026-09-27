import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Transactional email for registration (acknowledgement + confirmation).
 *
 * Transport mirrors the ops platform: SMTP via nodemailer when SMTP_* is set,
 * otherwise a console fallback so local dev still walks the whole path.
 * Nothing here throws — send failures return FAILED so the caller can keep the
 * registration CONFIRMED and surface "Email delivery failed" in /admin for a
 * manual resend (per spec: a mail outage must not un-confirm a paid team).
 */

export type MailResult = { status: "SENT" | "FAILED"; error?: string };

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD?.trim());
}

let transporter: Transporter | null = null;
function smtp(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASSWORD!.trim() },
  });
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<MailResult> {
  if (!smtpConfigured()) {
    const attachNames = input.attachments?.map((a) => a.filename).join(", ") || "none";
    console.info(
      `[email:dev] to=${input.to} subject="${input.subject}" attachments=${input.attachments?.length ?? 0} [${attachNames}]`,
    );
    return { status: "SENT" };
  }
  try {
    await smtp().sendMail({
      from: process.env.EMAIL_FROM?.trim() || "TechSiege <no-reply@example.com>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    });
    return { status: "SENT" };
  } catch (e) {
    return { status: "FAILED", error: e instanceof Error ? e.message : "SMTP send failed" };
  }
}

function shell(body: string, extraHtml = ""): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const ps = escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.65">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#e8ecf1;background:#0a0c10;padding:28px;border:1px solid #202634;border-radius:12px"><p style="margin:0 0 18px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#22d3ee">TechSiege 2026</p>${ps}${extraHtml}<hr style="border:none;border-top:1px solid #202634;margin:22px 0"><p style="margin:0;font-size:12px;color:#7d8799">Questions? Reply to this email or write to cynex.depticb@gmail.com.</p></div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function acknowledgementEmail(input: {
  teamName: string;
  teamCode: string;
  leaderName: string;
}): { subject: string; html: string; text: string } {
  const subject = "TechSiege 2026 — Registration Received";
  const body = `Hi ${input.leaderName},

Your TechSiege registration has been received successfully. Your payment is currently awaiting verification by the Ops team. Your event tickets will be issued after payment verification.

Team: ${input.teamName}
Reference ID: ${input.teamCode}

Please wait for payment verification. You will receive a confirmation email with your event tickets once the Ops team approves your payment.`;
  return { subject, html: shell(body), text: body };
}

export function confirmationEmail(input: {
  teamName: string;
  teamCode: string;
  leaderName: string;
  members: { name: string; ticketId: string; pdfFilename: string }[];
  venue: string;
  dates: string;
}): { subject: string; html: string; text: string } {
  // Required subject format
  const subject = "TechSiege 2026 — Registration Confirmed & Tickets";

  const memberLines = input.members
    .map((m) => `• ${m.name} — Ticket ID: ${m.ticketId} (Attached: ${m.pdfFilename})`)
    .join("\n");

  const memberHtmlRows = input.members
    .map(
      (m) =>
        `<li style="margin-bottom:8px"><strong>${esc(m.name)}</strong> — Ticket ID: <span style="font-family:monospace;color:#22d3ee">${esc(m.ticketId)}</span><br><span style="font-size:12px;color:#94a3b8">📎 ${esc(m.pdfFilename)}</span></li>`,
    )
    .join("");

  const body = `Hi ${input.leaderName},

Your payment has been verified and your team's registration for TechSiege 2026 is officially CONFIRMED!

Your individual admission ticket PDFs are attached to this email. Each team member has a separate ticket containing their unique ticket ID and check-in QR code.

Team: ${input.teamName}
Team Code: ${input.teamCode}

Attached Member Tickets:
${memberLines}

Event Dates: ${input.dates}
Venue: ${input.venue}

Check-In Instructions:
Every participant must present their personal ticket QR code (from their attached PDF) at the registration desk on event day. You may show the QR code directly from your smartphone or bring a printed copy.

Please ensure all team members bring their college ID card, laptop, and charger.

See you at TechSiege 2026!`;

  const extraHtml = `
<div style="background:#111622;border:1px solid #202b3d;border-radius:8px;padding:16px;margin:18px 0">
  <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#22d3ee;text-transform:uppercase;letter-spacing:.05em">Attached Member Ticket PDFs (${input.members.length}):</p>
  <ul style="margin:0;padding-left:18px;color:#e2e8f0;font-size:13px;line-height:1.6">
    ${memberHtmlRows}
  </ul>
</div>
`;

  return { subject, html: shell(body, extraHtml), text: body };
}

export function resubmissionEmail(input: {
  teamName: string;
  teamCode: string;
  leaderName: string;
  reason: string;
}): { subject: string; html: string; text: string } {
  const subject = "TechSiege 2026 — Payment Proof Needed Again";
  const body = `Hi ${input.leaderName},

The Ops team reviewed your TechSiege payment but could not verify it yet. Please submit your payment proof again.

Team: ${input.teamName}
Reference ID: ${input.teamCode}

What to fix: ${input.reason}

No tickets have been issued — they will follow once your payment is verified. Reply to this email if you need help.`;
  return { subject, html: shell(body), text: body };
}
