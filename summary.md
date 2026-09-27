# TechSiege Frontend — Features & Gaps

> Main website for the hackathon event. Next.js fullstack app: marketing site + registration API + organizer dashboard in one process.
> Generated 2026-09-27, updated 2026-09-27 (payment-verified registration workflow).

## New: payment-verified registration workflow + PDF ticket attachments (2026-09-27)

- `/register` shows the official payment QR (`PAYMENT` in `lib/content.ts:190-197`, art at `public/payment-qr.svg` — replace with the real UPI QR), collects payment reference + screenshot (PNG/JPEG/WebP, ≤5 MB, magic-byte validated), and stores teams as `PAYMENT_PENDING`/`PENDING` with a unique `TSG-XXXX` code. No tickets at submit time.
- Leader-only acknowledgement email (`TechSiege 2026 — Registration Received`); confirmation email (`TechSiege 2026 — Registration Confirmed & Tickets`) carries all individual member ticket PDFs as file attachments (`TECHSIEGE-2026-<Name>.pdf`), sent immediately when Ops verifies payment. No ticket links or "sent later" placeholders.
- Statuses: registration `PAYMENT_PENDING|PAYMENT_VERIFICATION|PAYMENT_REJECTED|RESUBMISSION_REQUIRED|CONFIRMED|CANCELLED`, payment `PENDING|VERIFIED|REJECTED`, ticket `GENERATED|CHECKED_IN|CANCELLED` (`lib/server/registrationStatus.ts`). Tickets are per-member, idempotent, QR tokens are 256-bit (`lib/server/tickets.ts`).
- PDF Tickets: Generated via lightweight `pdf-lib` + `qrcode` (`lib/server/ticketPdf.ts`). Each PDF includes TECHSIEGE 2026, BUILD. AUTOMATE. ACT., participant name, team name, institution, track, event dates, venue, ticket ID (`TS26-XXXXXX`), high-contrast scannable check-in QR code, and check-in instructions. Stored privately on disk in `data/tickets/<teamId>/` and tracked in `public.tickets` (`pdf_path`, `pdf_filename`, `pdf_status`, `pdf_generated_at`).
- Idempotency & Resend: Repeat payment verification reuses existing tickets and PDFs without re-generating tokens or re-sending mail automatically. If mail delivery fails, status becomes `FAILED` and `/admin` provides `[RESEND TICKETS]`, which re-attaches existing PDFs without re-minting ticket IDs or QR tokens.
- Screenshots live in private `data/payments/` (gitignored), viewable only via admin-authed `GET /api/admin/payments/[id]/screenshot` — no public URL (`lib/server/paymentFiles.ts`).
- `/admin` defaults to a Payment Verification tab: status filters, `Team|Leader|Members|Payment|Submitted|Status|Action` queue, dossier with screenshot + members + decision history, `[VERIFY]`/`[REJECT]`/`[REQUEST RESUBMISSION]`, `[RESEND TICKETS]`, plus a Check-in scan tab (`POST /api/admin/checkin`, admin-only, idempotent).
- Every decision records admin fingerprint + timestamp + reason in `payment_decisions`. Email failures never roll back confirmation (`confirmation_email_status=FAILED` surfaces in admin).
- Verified live against production Neon DB and local server via automated test runner (`npm run test:workflow`).

## 1. Overview
- Stack: Next.js 14.2.13, React 18, Tailwind 3.4, TypeScript, `framer-motion`, `@phosphor-icons/react`, `pg`, `zod` — `package.json:15-23`.
- Routes: `/` (12-section landing), `/register`, `/admin`, `/api/*` (8 routes).
- Content model: single source of truth in `lib/content.ts:1-216` + canonical track IDs in `lib/tracks.ts:10-17`. Most copy changes need no layout edits.
- Event configured: TechSiege, Oct 30–31 2026, AIET Mijar / Mangaluru, 200+ participants, 50+ teams, 6 tracks, 24h offline.
- Health: `npm run typecheck` clean. `.next/` build present. `.env` + `.env.local` present (gitignored).

## 2. Features — what exists today

### Landing page (`app/page.tsx:15-38`)
Composes 12 blocks + nav/progress:
- `Navbar.tsx:1-57` — fixed header, scroll-aware blur, 7 anchor links (`NAV_LINKS` in `lib/content.ts:38-46`), mobile hamburger menu.
- `Hero.tsx:65-128` — canvas particle network (`NetworkCanvas`), pointer-reactive glow, typewriter tagline, dual CTA (Register / View tracks), live `Countdown`.
- `Ticker.tsx:5-20` — seamless marquee (tagline + dates + city), pauses on hover, disabled under reduced-motion.
- `About.tsx:6-44` — stats band (200+/50+/6/24h via `STATS`) + "chatbot wrappers don't pass vs agents that act" positioning.
- `Tracks.tsx:22-57` — 6 cards (Autonomous, Education, Healthcare, Finance, Social Impact, Dev Agents) with icons, desc, examples. Titles derived from `lib/tracks.ts` so UI and API can't disagree.
- `Requirements.tsx:5-33` — 6-item agentic bar (tool integration, multi-step, memory, RAG, multi-agent/HITL, safety/audit).
- `Schedule.tsx:7-54` — Day 1/Day 2 tab switcher, 8 + 7 items, animated timeline (08:00 Day 1 → 17:30 awards Day 2).
- `Judging.tsx:6-60` — 6-criterion weighted rubric (25/20/20/15/10/10) with animated bars + donut chart.
- `Awards.tsx:5-69` — featured Grand Champion (₹50k*) + 10 prize rows + 5-item submission checklist (repo, summary, architecture diagram, demo video, declarations).
- `Sponsors.tsx:6-28` — placeholder only (see Gaps).
- `FAQ.tsx:8-39` — 6-item accordion (eligibility, cost, what to bring, no pre-build, agent-vs-chatbot, selection).
- `ClosingCTA.tsx:5-52` — final-call + countdown + register button + 3-column footer (brand, explore links, contact email).
- Shared UX: `Reveal.tsx` scroll reveals, `ScrollProgress.tsx` top bar, `StatNumber.tsx` animated numbers, `Typewriter.tsx`, skip-to-content link in `app/page.tsx:18-20`.

### Registration flow (working end-to-end)
- UI `components/RegisterForm.tsx:8-187` — team details (name, institution, city, track select, project idea) + 2–4 members (first = lead) with add/remove + rules checkbox. Inline loading/error/success states.
- Validation `lib/server/validation.ts:11-29` — Zod: name/institution ≥2 chars, valid email/phone, 2–4 members, unique emails, `agreeRules: true`.
- API `app/api/register/route.ts:10-80` — rate-limited (30/min), `MAX_TEAMS = 60` cap check, transactional `INSERT` into `public.teams` + `public.members`, 409 on duplicate email (`UNIQUE_VIOLATION`), 503 when no `DATABASE_URL`.
- Slot counter `app/api/teams/count/route.ts:12-18` — public `{teams, maxTeams, configured}` for UI.
- DB `db/schema.sql:9-32` — `teams` + `members` (lead flag, contact fields, cascade delete), case-insensitive email uniqueness. Scripts: `scripts/migrate.ts`, `scripts/seedDemo.ts` (`db:migrate`, `seed:demo`, `seed:clear`).
- Ops forwarding (uncommitted, in progress) `lib/server/ops.ts:53-148` — after local commit, POSTs to `OPS_API_URL/api/register` with `sourceRef = teamId` (idempotent), 8s timeout, never throws. Returns `{teamCode, acknowledged, emailed}`. Form shows team code (e.g. `TSG-4F2K`) or amber "saved but email not sent" fallback.

### Organizer dashboard (`/admin`)
- `components/AdminDashboard.tsx:52-339` — token gate (sessionStorage `cynex_admin_token`, `ADMIN_TOKEN` bearer), stats header (teams/members/colleges/last-24h + capacity bar), charts (registrations/day, by track, by institution, cities, team sizes), latest-registrations table, CSV export via `/api/admin/registrations.csv` rewrite (`next.config.js:5-14`), refresh/sign-out. `robots: noindex` in `app/admin/page.tsx:5-8`.

### Other APIs
- `GET /api/health` — `{service, time}` liveness probe.
- `GET /api/config` — runtime event name/dates/links from env with `lib/content.ts` fallback (no rebuild needed).
- `POST /api/contact`, `POST /api/subscribe` — validated + rate-limited but **log-only** (no DB/email).

### Config / theming
- Theme `tailwind.config.ts:7-24` (`void/navy/panel/accent/violet2/lime2`), `app/globals.css:10-33` (grid bg, glass, gradient text, marquee keyframes, focus ring).
- Fonts via `next/font` (`Space_Grotesk` + `Inter`) in `app/layout.tsx:6-7`. Env split documented in `.env.example:1-41` (public `.env` vs secret `.env.local`).

## 3. Gaps

### P0 — must fix before launch
1. **Uncommitted ops work** — `git status`: 6 modified + untracked `lib/server/ops.ts`. Register flow behavior differs between HEAD and worktree. Commit or stash before deploy.
2. **`OPS_API_URL` unset = silent no-email** — `lib/server/ops.ts:58-63` returns `ok:false` when unset; default in `.env.example:41` is `localhost:3100`. Prod needs real URL or teams get "saved but email not sent" with no retry except manual `db:sync-registrations` in ops.
3. **Placeholder domains** — `metadataBase https://techsiege.example.com` (`app/layout.tsx:12`), `sponsorFormUrl` / `mentorFormUrl https://forms.example.com/*` (`lib/content.ts:30-31`). Breaks SEO/OG cards and sponsor/mentor CTAs.
4. **`public/` is empty** — no favicon, OG image, logos. Social shares + browser tab look broken.

### P1 — content / functional holes
5. **Sponsors section is a stub** — `Sponsors.tsx:10-10` "announcing soon". Tier data exists in `lib/content.ts:182-189` but no logo wall, no confirmed sponsors.
6. **`contact` / `subscribe` go nowhere** — log-only endpoints. If any UI posts to them, inquiries are lost except in server logs. Either persist/forward to ops mailer or remove the forms.
7. **Prize amounts marked `*` / "indicative"** — `Awards.tsx:10-10` says pool scales with sponsorships. Needs final confirmation before printing/commitments.
8. **No auth beyond shared token** — admin is a single `ADMIN_TOKEN` in sessionStorage, no rotation, no per-user audit. Fine for small core team, not for wider sharing.
9. **No waitlist flow** — at 60 teams API returns 409 with "email us" text (`app/api/register/route.ts:18`). No automated waitlist capture.

### P2 — polish / tech debt
10. **No tests** — no unit/integration/e2e runner. Registration (money-adjacent trust path) has zero automated coverage.
11. **No error monitoring / analytics** — failures only via `console.error`; no Sentry/PostHog/Umami.
12. **A11y mostly good, minor risks** — skip link, focus rings, `aria-expanded/pressed`, reduced-motion guards present; judging bars use `role=img` with labels but donut chart is SVG-only; CSV/table not paginated for 60 teams.
13. **Rate limiting is in-memory** (`lib/server/rateLimit.ts`) — won't hold across multiple instances/serverless concurrency.
14. **Event date duplicated** — `EVENT_START_ISO` hardcoded in `lib/content.ts:13` drives countdown/schedule display; `/api/config` env override only affects API consumers (noted in `.env.example:28-33`). Moving the date requires editing the file + rebuild.
15. **No sitemap/robots/footer socials** — footer has contact email only; no X/Instagram/LinkedIn/Discord links typical for hackathon outreach.

## 4. Suggested next steps
1. Commit ops forwarding + set `OPS_API_URL`, `DATABASE_URL`, `ADMIN_TOKEN` in prod; end-to-end test register → team code → email → admin CSV.
2. Replace `example.com` URLs, add `public/og.png + favicon.ico`, confirm prize/sponsor copy.
3. Decide contact/subscribe fate (wire up or delete).
4. Add minimal e2e (register happy-path, duplicate-email 409, capacity 409, admin auth 401/200) + uptime check on `/api/health`.
