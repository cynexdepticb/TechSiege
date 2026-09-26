/**
 * Canonical tracks. The single source of truth for anything that needs to
 * validate or label a track — the registration form, the API route, and the
 * organizer dashboard all read from here.
 *
 * `lib/content.ts` composes these into the richer cards the site renders (it
 * adds `desc` and `examples`), so a track can never exist in the UI without
 * being accepted by the API, or vice versa.
 */
export const TRACKS = [
  { id: "autonomous", title: "Autonomous AI" },
  { id: "education", title: "AI for Education" },
  { id: "healthcare", title: "AI for Healthcare" },
  { id: "finance", title: "AI for Finance" },
  { id: "social", title: "AI for Social Impact" },
  { id: "devagents", title: "AI Developer Agents" },
] as const;

export const TRACK_IDS = TRACKS.map((t) => t.id) as [TrackId, ...TrackId[]];

export type TrackId = (typeof TRACKS)[number]["id"];

/** Track id → display label, for API responses that need a human-readable name. */
export const TRACK_LABELS: Record<TrackId, string> = Object.fromEntries(
  TRACKS.map((t) => [t.id, t.title]),
) as Record<TrackId, string>;

/** Hard cap on total teams for the event. */
export const MAX_TEAMS = 60;
