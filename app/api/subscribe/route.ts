import { ok, readJson, route } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { subscribeSchema } from "@/lib/server/validation";

/** POST /api/subscribe — countdown CTA email capture. Logs only, as before. */
export const POST = route(async (req) => {
  await rateLimit({ windowMs: 60_000, max: 30 })(req);

  const data = subscribeSchema.parse(await readJson(req));
  console.log("[subscribe]", data.email);

  return ok({}, 201);
});
