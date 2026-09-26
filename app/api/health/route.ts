import { ok, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/health */
export const GET = route(async () => ok({ service: "techsiege-web", time: new Date().toISOString() }));
