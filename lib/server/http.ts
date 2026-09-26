import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./errors";

export const ok = <T extends Record<string, unknown>>(data: T, status = 200) =>
  NextResponse.json({ ok: true, ...data }, { status });

export const fail = (status: number, message: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: false, message, ...extra }, { status });

/**
 * Wraps a route handler so every failure mode produces the same JSON envelope
 * the old Express `errorHandler` produced: `{ ok: false, ... }`, with Zod
 * failures expanded into a `path`/`message` list the forms already render.
 *
 * `console.error` is skipped for expected client errors — a 409 duplicate
 * registration is not a server fault and shouldn't page anyone.
 */
export function route<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response>,
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(
          400,
          "Validation failed.",
          { errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })) },
        );
      }
      if (err instanceof HttpError) {
        return fail(err.status, err.message, err.extra);
      }
      console.error("[api] unhandled", req.url, err);
      return fail(500, "Internal server error");
    }
  };
}

/** Parses a JSON body, turning a malformed one into a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
