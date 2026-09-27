import type { RegisterInput } from "./validation";

/**
 * Forwards a marketing-site registration to the ops platform.
 *
 * The ops app is the one that owns team codes, per-track capacity, the check-in QR
 * and every email, so a registration that never reaches it is a team the
 * organisers cannot acknowledge, cannot chase payment for and cannot admit. It
 * used to get there only by someone running `npm run db:sync-registrations` by
 * hand, which is not a step a student can rely on.
 *
 * The order matters. The caller commits to its own `public.teams` row *first* and
 * only then calls this, so:
 *
 *   - ops being down does not lose the registration, it just delays the email
 *   - the row keeps its `id`, which is passed as `sourceRef` and makes both this
 *     call and the later import idempotent
 *   - a timeout and retry cannot create a second team
 *
 * Nothing here throws. A failed forward is a normal, recoverable condition, and
 * letting it reject the request would tell a student their registration failed
 * when it is safely stored.
 */

export type ForwardResult = {
  /** False when ops could not be reached or refused. Never throws. */
  ok: boolean;
  /** Set when ops created or already had the team. */
  teamCode?: string;
  teamId?: string;
  /** True when ops recognised this sourceRef as a team it already had. */
  duplicate?: boolean;
  /** How many members ops actually emailed. */
  emailed?: number;
  recipients?: number;
  undelivered?: string[];
  /** Human-readable reason for a failure, safe to log but not to show a student. */
  reason?: string;
};

/**
 * How long to wait before giving up. Long enough to survive a cold start, short
 * enough that a student watching a spinner does not assume the site is broken.
 */
const TIMEOUT_MS = 8_000;

function opsUrl(): string | null {
  const raw = process.env.OPS_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export async function forwardRegistration(
  sourceRef: string,
  data: RegisterInput,
): Promise<ForwardResult> {
  const base = opsUrl();
  if (!base) {
    return {
      ok: false,
      reason: "OPS_API_URL is not set, so registrations are not forwarded to ops.",
    };
  }

  // The marketing form's first member is the lead; ops wants that split out
  // because it drives the greeting name and the duplicate-member rule.
  const [lead, ...rest] = data.members;

  const payload = {
    action: "submit" as const,
    sourceRef,
    team: {
      name: data.teamName,
      college: data.institution,
      city: data.city,
      contactName: lead.fullName,
      contactEmail: lead.email,
      contactPhone: lead.phone,
      projectIdea: data.projectIdea,
      // Sent as the marketing track id. ops resolves it through TRACK_MAP.
      trackId: data.trackId,
    },
    members: data.members.map((m, i) => ({
      name: m.fullName,
      email: m.email,
      phone: m.phone,
      college: data.institution,
      year: m.branchYear,
      isLeader: i === 0,
    })),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      // Never cached: this is a write, and a cached 200 would silently skip the
      // email on a retry.
      cache: "no-store",
    });

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      // A proxy or a crashed app can answer with HTML. The status still tells us
      // enough to report the failure usefully.
      return { ok: false, reason: `ops returned a non-JSON ${res.status} response` };
    }

    if (!res.ok || json.ok === false) {
      const reason =
        typeof json.error === "string"
          ? json.error
          : typeof json.message === "string"
            ? json.message
            : `ops responded ${res.status}`;
      return { ok: false, reason };
    }

    const team = (json.team ?? {}) as { id?: string; code?: string };
    return {
      ok: true,
      teamId: team.id,
      teamCode: team.code,
      duplicate: json.duplicate === true,
      emailed: typeof json.emailed === "number" ? json.emailed : undefined,
      recipients: typeof json.recipients === "number" ? json.recipients : undefined,
      undelivered: Array.isArray(json.undelivered) ? (json.undelivered as string[]) : [],
    };
  } catch (e) {
    const reason =
      e instanceof Error && e.name === "AbortError"
        ? `ops did not respond within ${TIMEOUT_MS / 1000}s`
        : e instanceof Error
          ? e.message
          : "unknown error reaching ops";
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}
