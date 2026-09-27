import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { SITE } from "@/lib/content";
import { TRACK_LABELS, type TrackId } from "@/lib/tracks";

export type TicketPdfParams = {
  ticketId: string;
  qrToken: string;
  participantName: string;
  teamName: string;
  institution: string;
  trackId: string;
  eventDate?: string;
  venue?: string;
};

/**
 * Clean text to WinAnsi/ASCII printable range to prevent PDF font encoding failures.
 */
export function cleanPdfText(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/**
 * Standardized ticket PDF filename per participant:
 * e.g. `TECHSIEGE-2026-Rahul-Kumar.pdf`
 */
export function ticketPdfFilename(memberName: string): string {
  const sanitized = memberName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `TECHSIEGE-2026-${sanitized || "Member"}.pdf`;
}

/**
 * Render a professional TechSiege 2026 admission ticket PDF.
 */
export async function renderTicketPdf(params: TicketPdfParams): Promise<Buffer> {
  const doc = await PDFDocument.create();
  // Landscape ticket pass format (620 x 360 pt)
  const page = doc.addPage([620, 360]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);

  // Background - Dark theme #0a0d12
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 620,
    height: 360,
    color: rgb(0.04, 0.05, 0.07),
  });

  // Outer border - Cyan accent #22d3ee
  page.drawRectangle({
    x: 12,
    y: 12,
    width: 596,
    height: 336,
    borderColor: rgb(0.13, 0.83, 0.93),
    borderWidth: 1.5,
  });

  // Top header banner
  page.drawText("TECHSIEGE 2026", {
    x: 28,
    y: 312,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText("BUILD. AUTOMATE. ACT.", {
    x: 28,
    y: 296,
    size: 9,
    font: bold,
    color: rgb(0.13, 0.83, 0.93),
  });

  // Official Admission Badge
  page.drawRectangle({
    x: 245,
    y: 304,
    width: 155,
    height: 22,
    color: rgb(0.08, 0.15, 0.22),
    borderColor: rgb(0.13, 0.83, 0.93),
    borderWidth: 1,
  });
  page.drawText("OFFICIAL ADMISSION TICKET", {
    x: 253,
    y: 311,
    size: 8,
    font: bold,
    color: rgb(0.13, 0.83, 0.93),
  });

  // Dashed perforation line separating main pass from stub
  page.drawLine({
    start: { x: 418, y: 14 },
    end: { x: 418, y: 346 },
    thickness: 1,
    color: rgb(0.25, 0.32, 0.42),
    dashArray: [4, 4],
  });

  // Left Section - Details
  // Participant Name
  page.drawText("PARTICIPANT NAME", {
    x: 28,
    y: 260,
    size: 8,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText(params.participantName), {
    x: 28,
    y: 240,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Team & Track
  const trackLabel = TRACK_LABELS[params.trackId as TrackId] ?? params.trackId;

  page.drawText("TEAM", {
    x: 28,
    y: 212,
    size: 8,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText(params.teamName), {
    x: 28,
    y: 196,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText("TRACK", {
    x: 210,
    y: 212,
    size: 8,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText(trackLabel), {
    x: 210,
    y: 196,
    size: 12,
    font: bold,
    color: rgb(0.13, 0.83, 0.93),
  });

  // Institution
  page.drawText("INSTITUTION", {
    x: 28,
    y: 168,
    size: 8,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText(params.institution), {
    x: 28,
    y: 152,
    size: 10.5,
    font,
    color: rgb(0.9, 0.93, 0.96),
  });

  // Event & Venue Card Box
  page.drawRectangle({
    x: 28,
    y: 35,
    width: 372,
    height: 95,
    color: rgb(0.06, 0.08, 0.12),
    borderColor: rgb(0.18, 0.24, 0.32),
    borderWidth: 1,
  });

  page.drawText("EVENT DATE", {
    x: 38,
    y: 110,
    size: 7.5,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText(params.eventDate ?? "October 30-31, 2026"), {
    x: 38,
    y: 96,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText("VENUE", {
    x: 38,
    y: 76,
    size: 7.5,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText("Alva's Institute of Engineering and Technology,"), {
    x: 38,
    y: 62,
    size: 8.5,
    font,
    color: rgb(0.85, 0.89, 0.94),
  });
  page.drawText(cleanPdfText("Mijar Campus, Mangaluru, Karnataka"), {
    x: 38,
    y: 49,
    size: 8.5,
    font,
    color: rgb(0.85, 0.89, 0.94),
  });

  // Right Section - Stub
  page.drawText("TICKET ID", {
    x: 432,
    y: 324,
    size: 7.5,
    font: bold,
    color: rgb(0.55, 0.62, 0.72),
  });
  page.drawText(cleanPdfText(params.ticketId), {
    x: 432,
    y: 308,
    size: 13,
    font: mono,
    color: rgb(0.13, 0.83, 0.93),
  });

  // QR Code container box (Pure white background for maximum contrast & scannability)
  page.drawRectangle({
    x: 432,
    y: 112,
    width: 162,
    height: 180,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.85, 0.89, 0.94),
    borderWidth: 1,
  });

  page.drawText("CHECK-IN QR CODE", {
    x: 468,
    y: 277,
    size: 7.5,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Generate high-resolution QR PNG
  const qrBuffer = await QRCode.toBuffer(params.qrToken, {
    type: "png",
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0e14", light: "#ffffff" },
  });
  const qrImage = await doc.embedPng(qrBuffer);
  page.drawImage(qrImage, {
    x: 440,
    y: 125,
    width: 146,
    height: 146,
  });

  page.drawText("Present this QR code at event check-in.", {
    x: 432,
    y: 78,
    size: 7.5,
    font: bold,
    color: rgb(0.85, 0.89, 0.94),
  });

  // Status pill
  page.drawRectangle({
    x: 432,
    y: 40,
    width: 162,
    height: 24,
    color: rgb(0.08, 0.2, 0.1),
    borderColor: rgb(0.4, 0.8, 0.2),
    borderWidth: 1,
  });
  page.drawText("PAYMENT VERIFIED - ADMIT ONE", {
    x: 440,
    y: 48,
    size: 8,
    font: bold,
    color: rgb(0.64, 0.9, 0.21),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Stores the ticket PDF under `data/tickets/<teamId>/<filename>`.
 */
export async function storeTicketPdf(
  teamId: string,
  filename: string,
  buf: Buffer,
): Promise<string> {
  const dir = path.join(process.cwd(), "data", "tickets", teamId);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const relativePath = path.join("data", "tickets", teamId, filename);
  await fs.writeFile(path.join(process.cwd(), relativePath), buf, { mode: 0o600 });
  return relativePath;
}

/**
 * Reads a stored ticket PDF from disk.
 */
export async function readTicketPdf(relativePath: string): Promise<Buffer> {
  const root = path.join(process.cwd(), "data", "tickets");
  const abs = path.resolve(process.cwd(), relativePath);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Invalid ticket PDF path.");
  }
  return fs.readFile(abs);
}

/**
 * Checks if a ticket PDF exists on disk and is non-empty.
 */
export async function ticketPdfExists(relativePath: string): Promise<boolean> {
  if (!relativePath) return false;
  try {
    const root = path.join(process.cwd(), "data", "tickets");
    const abs = path.resolve(process.cwd(), relativePath);
    if (abs !== root && !abs.startsWith(root + path.sep)) return false;
    const stat = await fs.stat(abs);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}
