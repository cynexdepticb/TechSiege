/**
 * Demo data for the organizer dashboard. Every seeded team is prefixed "[demo]".
 * Usage:
 *   npm run seed:demo     → insert demo registrations
 *   npm run seed:clear    → remove them (safe: only matches the [demo] prefix)
 */
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { TRACK_IDS } from "../lib/tracks";

loadEnvConfig(process.cwd());

const COLLEGES = [
  "Alva's Institute of Engineering and Technology",
  "Sahyadri Institute of Technology",
  "NMAM Institute of Technology",
  "St. Joseph Engineering College",
  "Puttur Institute of Engineering and Technology",
  "Canara College of Engineering and Technology",
  "JNNCE College of Engineering",
  "Yenepoya Institute of Technology",
  "Karnataka Institute of Technology",
  "Mangalore Institute of Technology and Engineering",
];
const CITIES = ["Mangaluru", "Mangaluru", "Udupi", "Manipal", "Moodbidri", "Puttur", "Mangaluru", "Udupi"];
const IDEAS = [
  "Meeting-minutes agent that extracts action items and pings owners in Slack",
  "RAG tutor that reads a student's notes and builds a 7-day revision plan",
  "Literature scout that pulls PubMed abstracts and drafts a gap analysis",
  "Expense agent that categorises receipts and flags anomalies monthly",
  "Agent that turns municipal scheme pages into plain-language eligibility answers",
  "Refactor agent that opens PRs with tests and a changelog for stale code",
  "Campus facilities agent that books labs via tool calls, no RAG needed",
  "Clinical intake agent that drafts structured triage notes for review",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }

  const mode = process.argv[2];
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (mode === "clear") {
      const { rowCount } = await pool.query("DELETE FROM teams WHERE team_name LIKE '[demo]%'");
      console.log(`Removed ${rowCount ?? 0} demo teams.`);
      return;
    }

    const now = Date.now();
    for (let i = 0; i < 14; i++) {
      const daysAgo = Math.floor((i * 9) / 14); // spread across the last ~9 days
      const created = new Date(now - daysAgo * 86400000 - i * 3600000);
      const size = 2 + (i % 3);
      const college = COLLEGES[i % COLLEGES.length]!;

      const team = await pool.query(
        `INSERT INTO teams (team_name, institution, city, track_id, project_idea, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          `[demo] Team ${i + 1}`,
          college,
          CITIES[i % CITIES.length],
          TRACK_IDS[i % TRACK_IDS.length],
          IDEAS[i % IDEAS.length],
          created,
        ],
      );

      for (let m = 0; m < size; m++) {
        await pool.query(
          `INSERT INTO members (team_id, is_lead, full_name, email, phone, branch_year, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            team.rows[0].id,
            m === 0,
            `Demo Member ${i + 1}${m === 0 ? "" : String.fromCharCode(65 + m)}`,
            `demo.t${i + 1}.m${m + 1}@example.com`,
            `+9198${String(700000000 + i * 100 + m).slice(0, 8)}`,
            ["CSE · 3rd year", "ISE · 2nd year", "AI & ML · 4th year", "MCA · 1st year"][i % 4],
            created,
          ],
        );
      }
    }
    console.log("Seeded 14 demo teams. Remove with: npm run seed:clear");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
