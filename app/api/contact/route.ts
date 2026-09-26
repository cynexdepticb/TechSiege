import { ok, readJson, route } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { contactSchema } from "@/lib/server/validation";

/**
 * POST /api/contact — general / sponsor / mentor inquiries.
 *
 * Logs rather than persists, unchanged from the Express version. If this should
 * become a real inbox, write to a table here or forward to the ops mailer; right
 * now the only durable copy is the platform log.
 */
export const POST = route(async (req) => {
  await rateLimit({ windowMs: 60_000, max: 30 })(req);

  const data = contactSchema.parse(await readJson(req));
  console.log("[contact]", JSON.stringify(data));

  return ok({ message: "Received. We'll reply within 2 working days." }, 201);
});
