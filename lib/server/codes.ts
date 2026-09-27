import { randomBytes, randomUUID } from "node:crypto";

/**
 * Non-guessable team codes + ticket ids / QR tokens.
 *
 * Team code:  TSG-<4 Crockford-base32, no ambiguous chars>  e.g. TSG-7KQZ
 * Ticket id:  TSG26-<6 chars>                                e.g. TSG26-9F3KXA
 * QR token:   32 random bytes hex (256 bits). Never sequential.
 */

const CROCKFORD = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function code(n: number): string {
  const bytes = randomBytes(n);
  let out = "";
  for (const b of bytes) out += CROCKFORD[b % CROCKFORD.length];
  return out;
}

export function newTeamCode(): string {
  return `TSG-${code(4)}`;
}

export function newTicketId(): string {
  return `TS26-${code(6)}`;
}

export function newQrToken(): string {
  return randomBytes(32).toString("hex");
}

/** Storage-safe random filename. The uploaded filename is never trusted. */
export function newUploadId(): string {
  return randomUUID();
}
