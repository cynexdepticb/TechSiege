// ─── TechSiege · single source of truth ─────────────────────────────
// Edit dates, links, tracks, schedule, judging, sponsors here — no layout changes needed.
// EVENT NAME: set NEXT_PUBLIC_EVENT_NAME in .env (see .env.example).
// Changing it only requires a rebuild — no code edits.
import { TRACKS as CANONICAL_TRACKS, type TrackId } from "./tracks";

const TRACK_TITLES = Object.fromEntries(CANONICAL_TRACKS.map((t) => [t.id, t.title])) as Record<
  TrackId,
  string
>;

const EVENT_NAME = (process.env.NEXT_PUBLIC_EVENT_NAME ?? "").trim() || "TechSiege";
const EVENT_START_ISO = "2026-10-30T08:00:00+05:30";

export const SITE = {
  name: EVENT_NAME,
  shortName: EVENT_NAME.replace(/\s*\d{4}\s*$/, "").trim() || EVENT_NAME,
  year: new Date(EVENT_START_ISO).getFullYear(),
  tagline: "Build. Automate. Act.",
  // ⚠️ EDIT ME: set the real event start date/time (IST).
  eventStartISO: EVENT_START_ISO,
  datesDisplay: "Oct 30–31, 2026",
  venue: "Alva's Institute of Engineering and Technology, Mijar Campus · Auditorium",
  city: "Mangaluru, Karnataka",
  participants: "200+",
  teams: "50+",
  // Internal registration page, served by this app's own POST /api/register.
  // External form URLs below.
  registrationUrl: "/register",
  sponsorFormUrl: "https://forms.example.com/techsiege-sponsor",
  mentorFormUrl: "https://forms.example.com/techsiege-mentor",
  contactEmail: "cynex.depticb@gmail.com",
  sponsorEmail: "sponsors@techsiege.in",
  college: "Alva's Institute of Engineering & Technology",
  collegeShort: "AIET · Mijar, Moodbidri",
};

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Tracks", href: "#tracks" },
  { label: "Schedule", href: "#schedule" },
  { label: "Judging", href: "#judging" },
  { label: "Awards", href: "#awards" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "FAQ", href: "#faq" },
];

export const STATS = [
  { value: "200+", label: "Participants", sub: "Engineering & MCA students" },
  { value: "50+", label: "Teams", sub: "2–4 members per team" },
  { value: "6", label: "Tracks", sub: "Real agentic problem statements" },
  { value: "24 hrs", label: "Offline Build", sub: "Mangaluru campus venue" },
];

export type Track = { id: TrackId; title: string; desc: string; examples: string[] };

// Titles come from lib/tracks.ts so the site and the API cannot disagree about
// which tracks exist. Only the presentation copy lives here.
export const TRACKS = [
  {
    id: "autonomous",
    title: TRACK_TITLES.autonomous,
    desc: "Agents that plan, act and finish work end-to-end.",
    examples: ["Research agents", "Productivity copilots", "Enterprise workflow automation"],
  },
  {
    id: "education",
    title: TRACK_TITLES.education,
    desc: "Tutors and tools that actually teach and administer.",
    examples: ["Personalized tutors", "Assessment graders", "Teacher admin assistants"],
  },
  {
    id: "healthcare",
    title: TRACK_TITLES.healthcare,
    desc: "Information & workflow assistants for care teams.",
    examples: ["Triage intake agents", "Literature research", "Discharge-summary helpers"],
  },
  {
    id: "finance",
    title: TRACK_TITLES.finance,
    desc: "Agents that read numbers and explain what matters.",
    examples: ["Financial research", "Expense analysis", "Business-intelligence bots"],
  },
  {
    id: "social",
    title: TRACK_TITLES.social,
    desc: "Accessibility, public-service and planet-first agents.",
    examples: ["Accessibility aides", "Civic-service bots", "Environmental monitors"],
  },
  {
    id: "devagents",
    title: TRACK_TITLES.devagents,
    desc: "Agents that ship software alongside you.",
    examples: ["Code + test generation", "Auto-documentation", "DevOps & code review"],
  },
] satisfies Track[];

/**
 * Compile-time guard: every canonical track id must appear above exactly once.
 * Adding a track to lib/tracks.ts and forgetting it here fails the build instead
 * of silently dropping it from the page.
 */
type MissingTrack = Exclude<TrackId, (typeof TRACKS)[number]["id"]>;
const _everyTrackIsShown: MissingTrack extends never ? true : ["missing from TRACKS:", MissingTrack] = true;
void _everyTrackIsShown;


export const REQUIREMENTS = [
  { title: "Tool / API integration", desc: "Agent calls real tools, APIs or data sources — not just chat replies." },
  { title: "Multi-step execution", desc: "Planning, task decomposition or workflow orchestration across steps." },
  { title: "Persistent state / memory", desc: "Session state, long-term memory or context carried across runs." },
  { title: "RAG / external knowledge", desc: "Retrieval over docs, web or datasets grounding the agent's actions." },
  { title: "Multi-agent or human-in-the-loop", desc: "Agent collaboration, delegation, approvals or escalation paths." },
  { title: "Safety & auditability", desc: "Error handling, validation, sandboxing and a visible action log." },
];

export type ScheduleDay = { day: string; date: string; items: { time: string; title: string; desc: string }[] };

// Full 08:00 → 17:30 two-day plan.
export const SCHEDULE: ScheduleDay[] = [
  {
    day: "Day 1",
    date: "Oct 30 — Build Day",
    items: [
      { time: "08:00 AM", title: "Registration & Check-in", desc: "Team verification, IDs, kits, workspace allotment." },
      { time: "09:00 AM", title: "Opening Ceremony", desc: "Welcome, rules, tracks, judging and safety briefing." },
      { time: "09:45 AM", title: "Keynote: The Agentic Shift", desc: "From chatbots to tool-using autonomous systems." },
      { time: "10:30 AM", title: "Hacking Begins", desc: "Team formation locked · repos created · mentor floor opens." },
      { time: "01:00 PM", title: "Lunch + Mentor Checkpoint 1", desc: "Architecture reviews: tools, memory and scope." },
      { time: "04:30 PM", title: "Mentor Checkpoint 2", desc: "Mid-build review: working tool call required." },
      { time: "08:00 PM", title: "Dinner + Night Sprint", desc: "Fuel up. Quiet hacking hours with mentor support." },
      { time: "11:59 PM", title: "Midnight Checkpoint", desc: "Progress log + demo-of-something-working submission." },
    ],
  },
  {
    day: "Day 2",
    date: "Oct 31 — Ship & Demo Day",
    items: [
      { time: "07:00 AM", title: "Sunrise Standup", desc: "Blockers clinic with mentors. Coffee on the house." },
      { time: "08:00 AM", title: "Breakfast + Final Sprint", desc: "Polish flows, record demo, freeze scope." },
      { time: "11:00 AM", title: "Submission Deadline", desc: "Repo + README + architecture diagram + demo video." },
      { time: "11:30 AM", title: "Screening Round", desc: "Judges screen all entries against agentic requirements." },
      { time: "01:00 PM", title: "Lunch + Finalist Announcement", desc: "Top ~10 teams advance to live demos." },
      { time: "02:00 PM", title: "Finalist Demos", desc: "5-min live demo + 2-min Q&A per team, on stage." },
      { time: "04:00 PM", title: "Judging & People's Choice", desc: "Deliberation + audience vote for People's Choice." },
      { time: "05:00 PM", title: "Awards & Closing", desc: "Prizes, sponsor thanks, group photo. See you in 2027." },
    ],
  },
];

export const JUDGING = [
  { label: "Agentic Capability", weight: 25, desc: "Tool use, planning, memory, autonomy depth." },
  { label: "Innovation", weight: 20, desc: "Originality of the problem + approach." },
  { label: "Technical Implementation", weight: 20, desc: "Architecture, code quality, robustness." },
  { label: "Problem Relevance & Clarity", weight: 15, desc: "Real need, clear scope, measurable outcome." },
  { label: "User Experience", weight: 10, desc: "Usability, design polish, accessibility." },
  { label: "Demo & Presentation", weight: 10, desc: "Live demo quality + storytelling." },
];

export const AWARDS = [
  { title: "Grand Champion", prize: "₹50,000* + Trophy", desc: "Best overall agentic system.", featured: true },
  { title: "1st Runner-Up", prize: "₹25,000*", desc: "Outstanding execution & demo." },
  { title: "2nd Runner-Up", prize: "₹15,000*", desc: "Strong agent + story." },
  { title: "Best AI Agent", prize: "₹10,000*", desc: "Deepest autonomy: tools, memory, planning." },
  { title: "Most Innovative Solution", prize: "₹10,000*", desc: "Boldest idea, well executed." },
  { title: "Best Education Agent", prize: "₹7,500*", desc: "Top build on the Education track." },
  { title: "Best Social Impact Agent", prize: "₹7,500*", desc: "Top build for public good." },
  { title: "Best Developer Agent", prize: "₹7,500*", desc: "Top dev-tooling agent." },
  { title: "Best Autonomous Workflow", prize: "₹7,500*", desc: "Cleanest end-to-end orchestration." },
  { title: "Best UX", prize: "₹5,000*", desc: "Most usable, accessible interface." },
  { title: "People's Choice", prize: "Goodies + Glory", desc: "Audience-voted favourite demo." },
];

export const SUBMISSION = [
  "Public GitHub repo with a clear README (setup, env, run steps)",
  "Project summary: problem, users, agent capabilities (≤ 300 words)",
  "Agent architecture diagram (tools, memory, flow, models)",
  "2–3 min demo video (unlisted link) showing real tool use",
  "Declaration of APIs, models, datasets & pre-existing code used",
];

export const SPONSOR_TIERS = [
  { name: "Title", range: "₹1,00,000+", perks: ["Naming rights + keynote slot", "Largest logo everywhere", "Judging seat + booth", "Resume book + talent access"] },
  { name: "Gold", range: "₹50,000–1,00,000", perks: ["Stage mention + booth", "Large logo on site & banners", "Mentor slot", "Resume book access"] },
  { name: "Silver", range: "₹25,000–50,000", perks: ["Medium logo placement", "Booth / stall space", "Social media spotlight"] },
  { name: "Bronze", range: "₹10,000–25,000", perks: ["Logo on website & slides", "Community shout-outs"] },
  { name: "Technology Partner", range: "Credits / Infra", perks: ["API credits, cloud, tooling", "Workshop slot", "Logo in dev resources"] },
  { name: "Prize / In-Kind", range: "Goodies / Prizes", perks: ["Swag, gadgets, subscriptions", "Logo on prize wall"] },
];

export const FAQS = [
  {
    q: "Who can participate?",
    a: "Students from engineering/MCA colleges across Mangaluru, Udupi/Manipal, Karnataka and Kerala. Teams of 2–4 members. Beginners with strong fundamentals are welcome — mentors will help you level up.",
  },
  {
    q: "Is it free? What's provided?",
    a: "Yes — participation is free for selected teams. Venue Wi-Fi, power, meals during the event, swag and mentor support are provided. Travel/stay details will be shared after selection.",
  },
  {
    q: "What should we bring?",
    a: "Laptops, chargers, valid college ID, and any hardware you need. Bring your own API keys where possible; partner credits will be announced closer to the event.",
  },
  {
    q: "Can we start building before the hackathon?",
    a: "No pre-built projects. You may research and learn tools beforehand, but code, prompts and integrations must be built during the 24 hours. Use of open-source libraries and public APIs is allowed and must be declared.",
  },
  {
    q: "Chatbot wrappers vs. real agents — what's expected?",
    a: "Your project must demonstrate agentic behaviour: tool/API calls, multi-step planning, memory or RAG, and error handling. Pure prompt-only chat UIs will not pass screening.",
  },
  {
    q: "How are teams selected?",
    a: "Register via the form; shortlisting is based on team profile, motivation and basic readiness. Selected teams will be confirmed by email.",
  },
];
