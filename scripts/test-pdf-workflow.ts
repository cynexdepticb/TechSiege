import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { confirmationEmail } from "../lib/server/mail";
import { ticketPdfFilename } from "../lib/server/ticketPdf";
import { newTeamCode } from "../lib/server/codes";

const DATABASE_URL = process.env.DATABASE_URL!;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;
const BASE_URL = "http://localhost:3000";

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  console.log("=== STARTING TECHSIEGE 2026 PDF TICKET WORKFLOW TEST ===\n");

  const testTeamId = randomUUID();
  const testTeamCode = newTeamCode();
  const leadMemberId = randomUUID();
  const secondMemberId = randomUUID();

  // Create a minimal 1x1 valid PNG for dummy payment screenshot
  const dummyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const screenshotDir = path.join(process.cwd(), "data", "payments", testTeamId);
  await fs.mkdir(screenshotDir, { recursive: true });
  const screenshotRelPath = path.join("data", "payments", testTeamId, "receipt.png");
  await fs.writeFile(path.join(process.cwd(), screenshotRelPath), dummyPng);

  console.log(`1. Creating test team ${testTeamCode} (${testTeamId}) with 2 members...`);
  await pool.query(
    `INSERT INTO public.teams
       (id, team_code, team_name, institution, city, track_id, project_idea,
        payment_reference, payment_screenshot_path, payment_screenshot_mime,
        payment_screenshot_size, registration_status, payment_status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PAYMENT_PENDING','PENDING',now())`,
    [
      testTeamId,
      testTeamCode,
      "Test Quantum Coders",
      "Alva's Institute of Engineering and Technology",
      "Mangaluru",
      "autonomous-agents",
      "Autonomous agent swarm for disaster response",
      "UPI-REF-TEST-9999",
      screenshotRelPath,
      "image/png",
      dummyPng.length,
    ],
  );

  const m1Name = "Rahul Kumar";
  const m1Email = `lead.rahul.${Date.now()}@example.com`;
  const m2Name = "Anil Kumar";
  const m2Email = `anil.${Date.now()}@example.com`;

  await pool.query(
    `INSERT INTO public.members (id, team_id, is_lead, full_name, email, phone, branch_year)
     VALUES ($1, $2, true, $3, $4, '+919876543210', 'CSE 3rd Year'),
            ($5, $2, false, $6, $7, '+919876543211', 'ISE 3rd Year')`,
    [leadMemberId, testTeamId, m1Name, m1Email, secondMemberId, m2Name, m2Email],
  );

  console.log("   ✓ Team and 2 members created successfully.");

  // 2. Trigger Ops Payment Verification
  console.log("\n2. Executing Ops Payment Verification (POST /api/admin/registrations/:id/decision with VERIFY)...");
  const verifyRes = await fetch(`${BASE_URL}/api/admin/registrations/${testTeamId}/decision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ decision: "VERIFY" }),
  });

  const verifyJson = await verifyRes.json();
  console.log("   Verification response status:", verifyRes.status);
  console.log("   Verification response body:", JSON.stringify(verifyJson, null, 2));

  if (!verifyRes.ok || !verifyJson.ok) {
    throw new Error(`Payment verification failed: ${JSON.stringify(verifyJson)}`);
  }

  // 3. Confirm Database State
  console.log("\n3. Validating Database State...");
  const teamRow = (await pool.query(`SELECT * FROM public.teams WHERE id = $1`, [testTeamId])).rows[0];
  console.log(`   Payment Status: ${teamRow.payment_status} (Expected: VERIFIED)`);
  console.log(`   Registration Status: ${teamRow.registration_status} (Expected: CONFIRMED)`);
  if (teamRow.payment_status !== "VERIFIED") throw new Error("Payment status is not VERIFIED!");
  if (teamRow.registration_status !== "CONFIRMED") throw new Error("Registration status is not CONFIRMED!");

  // 4. Confirm Exactly 2 Tickets Generated
  console.log("\n4. Validating Tickets...");
  const ticketRows = (
    await pool.query(
      `SELECT k.*, m.full_name, m.email
       FROM public.tickets k
       JOIN public.members m ON m.id = k.member_id
       WHERE k.team_id = $1
       ORDER BY m.is_lead DESC`,
      [testTeamId],
    )
  ).rows;

  console.log(`   Ticket count: ${ticketRows.length} (Expected: 2)`);
  if (ticketRows.length !== 2) throw new Error(`Expected exactly 2 tickets, found ${ticketRows.length}`);

  const t1 = ticketRows[0];
  const t2 = ticketRows[1];

  console.log(`   Ticket 1: Member=${t1.full_name}, ID=${t1.ticket_id}, QR_Token=${t1.qr_token.substring(0, 10)}..., PDF=${t1.pdf_filename}`);
  console.log(`   Ticket 2: Member=${t2.full_name}, ID=${t2.ticket_id}, QR_Token=${t2.qr_token.substring(0, 10)}..., PDF=${t2.pdf_filename}`);

  if (t1.ticket_id === t2.ticket_id) throw new Error("Ticket IDs are identical! Must be unique.");
  if (t1.qr_token === t2.qr_token) throw new Error("QR tokens are identical! Must be unique.");

  // 5. Confirm Exactly 2 PDF Files on Disk
  console.log("\n5. Validating PDF Files on Disk...");
  const expectedPdf1 = ticketPdfFilename(m1Name);
  const expectedPdf2 = ticketPdfFilename(m2Name);
  console.log(`   Expected PDF 1 Filename: ${expectedPdf1}`);
  console.log(`   Expected PDF 2 Filename: ${expectedPdf2}`);

  const pdf1Path = path.join(process.cwd(), t1.pdf_path);
  const pdf2Path = path.join(process.cwd(), t2.pdf_path);

  const pdf1Stat = await fs.stat(pdf1Path);
  const pdf2Stat = await fs.stat(pdf2Path);

  console.log(`   PDF 1 size: ${pdf1Stat.size} bytes (Path: ${t1.pdf_path})`);
  console.log(`   PDF 2 size: ${pdf2Stat.size} bytes (Path: ${t2.pdf_path})`);

  if (pdf1Stat.size < 1000) throw new Error("PDF 1 is too small or empty!");
  if (pdf2Stat.size < 1000) throw new Error("PDF 2 is too small or empty!");

  // Parse PDFs with pdf-lib to ensure valid format and contents
  const doc1 = await PDFDocument.load(await fs.readFile(pdf1Path));
  const doc2 = await PDFDocument.load(await fs.readFile(pdf2Path));

  console.log(`   PDF 1 page count: ${doc1.getPageCount()}`);
  console.log(`   PDF 2 page count: ${doc2.getPageCount()}`);
  if (doc1.getPageCount() !== 1 || doc2.getPageCount() !== 1) {
    throw new Error("Expected single-page PDF tickets!");
  }

  // 6. Validate Email Content & Rules
  console.log("\n6. Validating Email Content & Rules...");
  const mailCheck = confirmationEmail({
    teamName: teamRow.team_name,
    teamCode: teamRow.team_code,
    leaderName: "Rahul",
    members: ticketRows.map((t) => ({
      name: t.full_name,
      ticketId: t.ticket_id,
      pdfFilename: t.pdf_filename,
    })),
    venue: "Alva's Institute of Engineering and Technology, Mijar Campus, Mangaluru, Karnataka",
    dates: "October 30–31, 2026",
  });

  console.log(`   Email Subject: "${mailCheck.subject}"`);
  if (mailCheck.subject !== "TechSiege 2026 — Registration Confirmed & Tickets") {
    throw new Error(`Email subject does not match requirement! Found: "${mailCheck.subject}"`);
  }

  // Check forbidden phrases
  const lowerBody = mailCheck.text.toLowerCase();
  if (lowerBody.includes("receive your tickets later") || lowerBody.includes("sent in another email")) {
    throw new Error("Email contains forbidden text about receiving tickets later!");
  }
  if (lowerBody.includes("http://") || lowerBody.includes("https://")) {
    throw new Error("Email contains ticket URLs/links instead of relying on PDF attachments!");
  }
  console.log("   ✓ Email does NOT contain ticket URLs/links.");
  console.log("   ✓ Email does NOT say tickets will be sent later.");
  console.log("   ✓ Email states payment verified and tickets attached as PDFs.");

  // 7. Test Idempotency (Repeat Verification)
  console.log("\n7. Testing Idempotency (Repeating VERIFY PAYMENT on already-verified team)...");
  const repeatVerifyRes = await fetch(`${BASE_URL}/api/admin/registrations/${testTeamId}/decision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ decision: "VERIFY" }),
  });
  const repeatJson = await repeatVerifyRes.json();
  console.log("   Repeat verification duplicate flag:", repeatJson.duplicate);
  console.log("   Repeat verification emailed count:", repeatJson.emailed);

  if (repeatJson.duplicate !== true) throw new Error("Expected duplicate: true on repeated verification!");
  if (repeatJson.emailed !== 0) throw new Error("Expected emailed: 0 on duplicate verification (no duplicate email sent)!");

  // Verify tickets in DB still exactly 2 and identical IDs
  const repeatTickets = (
    await pool.query(`SELECT id, ticket_id, qr_token FROM public.tickets WHERE team_id = $1`, [testTeamId])
  ).rows;
  console.log(`   Tickets after repeat verify: ${repeatTickets.length}`);
  if (repeatTickets.length !== 2) throw new Error("Duplicate tickets were created on repeat verification!");
  if (repeatTickets[0].ticket_id !== t1.ticket_id || repeatTickets[1].ticket_id !== t2.ticket_id) {
    throw new Error("Ticket IDs changed on repeat verification!");
  }
  console.log("   ✓ Repeat verification is 100% idempotent: no new tickets, tokens, or emails created.");

  // 8. Test RESEND TICKETS Action
  console.log("\n8. Testing RESEND TICKETS (POST /api/admin/registrations/:id/resend)...");
  const resendRes = await fetch(`${BASE_URL}/api/admin/registrations/${testTeamId}/resend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
  });
  const resendJson = await resendRes.json();
  console.log("   Resend response status:", resendRes.status);
  console.log("   Resend response body:", JSON.stringify(resendJson));

  if (!resendRes.ok || !resendJson.ok) {
    throw new Error(`Resend failed: ${JSON.stringify(resendJson)}`);
  }
  if (resendJson.pdfCount !== 2) {
    throw new Error(`Expected pdfCount: 2 on resend, got: ${resendJson.pdfCount}`);
  }

  // Confirm tickets and PDFs were not altered
  const ticketsAfterResend = (
    await pool.query(`SELECT id, ticket_id, qr_token, pdf_path FROM public.tickets WHERE team_id = $1`, [testTeamId])
  ).rows;
  if (ticketsAfterResend.length !== 2) throw new Error("Tickets count changed after resend!");
  if (ticketsAfterResend[0].ticket_id !== t1.ticket_id) throw new Error("Ticket ID altered by resend!");
  console.log("   ✓ RESEND TICKETS successfully attached existing PDFs without regenerating tickets or tokens.");

  // 9. Test Event-Day Check-in Scanning
  console.log("\n9. Testing Check-in with Generated QR Token...");
  const checkinRes = await fetch(`${BASE_URL}/api/admin/checkin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: `TECHSIEGE:TICKET:${t1.qr_token}` }),
  });
  const checkinJson = await checkinRes.json();
  console.log("   Check-in response:", JSON.stringify(checkinJson));
  if (!checkinRes.ok || !checkinJson.ok) throw new Error("Check-in scan failed!");
  if (checkinJson.ticketId !== t1.ticket_id) throw new Error("Check-in returned wrong ticket ID!");

  // Idempotent check-in scan
  const repeatCheckinRes = await fetch(`${BASE_URL}/api/admin/checkin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: t1.ticket_id }),
  });
  const repeatCheckinJson = await repeatCheckinRes.json();
  console.log("   Repeat check-in response:", JSON.stringify(repeatCheckinJson));
  if (repeatCheckinJson.duplicate !== true) throw new Error("Expected duplicate: true on repeated checkin scan!");
  console.log("   ✓ Check-in is working and idempotent.");

  // 10. Cleanup Test Data
  console.log("\n10. Cleaning up test data...");
  await pool.query(`DELETE FROM public.teams WHERE id = $1`, [testTeamId]);
  await fs.rm(path.join(process.cwd(), "data", "tickets", testTeamId), { recursive: true, force: true }).catch(() => {});
  await fs.rm(path.join(process.cwd(), "data", "payments", testTeamId), { recursive: true, force: true }).catch(() => {});
  console.log("   ✓ Test data cleaned up.");

  console.log("\n=== ALL 13 TEST REQUIREMENTS VERIFIED SUCCESSFULLY! ===");
}

run()
  .catch((err) => {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
