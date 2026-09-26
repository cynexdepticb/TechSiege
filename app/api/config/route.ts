import { SITE } from "@/lib/content";
import { ok, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/config — event dates and links served from the server, so a rename
 * is an env change plus a restart rather than a rebuild of the inlined
 * NEXT_PUBLIC_ values. The static page copy still comes from `lib/content.ts`.
 */
export const GET = route(async () =>
  ok({
    eventName: process.env.EVENT_NAME ?? SITE.name,
    eventStartISO: process.env.EVENT_START_ISO ?? SITE.eventStartISO,
    registrationUrl: process.env.REGISTRATION_URL ?? SITE.registrationUrl,
  }),
);
