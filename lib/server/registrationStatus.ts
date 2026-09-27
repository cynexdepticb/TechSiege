/**
 * Explicit status model for payment-verified registration.
 *
 * Two independent columns on `public.teams` (see db/schema.sql):
 *   registration_status: PAYMENT_PENDING → PAYMENT_VERIFICATION → CONFIRMED
 *                        | PAYMENT_REJECTED | RESUBMISSION_REQUIRED | CANCELLED
 *   payment_status:      PENDING | VERIFIED | REJECTED
 *
 * Tickets live in `public.tickets` with GENERATED → CHECKED_IN | CANCELLED.
 * NOT_GENERATED is the absence of a row — no flag needed.
 */

export const REGISTRATION_STATUSES = [
  "PAYMENT_PENDING",
  "PAYMENT_VERIFICATION",
  "PAYMENT_REJECTED",
  "RESUBMISSION_REQUIRED",
  "CONFIRMED",
  "CANCELLED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TICKET_STATUSES = ["GENERATED", "CHECKED_IN", "CANCELLED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type PaymentDecision = "VERIFY" | "REJECT" | "RESUBMIT";

/** Tickets may only exist while payment is VERIFIED / registration CONFIRMED. */
export function canGenerateTickets(
  registrationStatus: string,
  paymentStatus: string,
): boolean {
  return registrationStatus === "CONFIRMED" && paymentStatus === "VERIFIED";
}

/** Legal admin transitions from the verification panel. */
export function decisionTarget(decision: PaymentDecision): {
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
} {
  switch (decision) {
    case "VERIFY":
      return { registrationStatus: "CONFIRMED", paymentStatus: "VERIFIED" };
    case "REJECT":
      return { registrationStatus: "PAYMENT_REJECTED", paymentStatus: "REJECTED" };
    case "RESUBMIT":
      return { registrationStatus: "RESUBMISSION_REQUIRED", paymentStatus: "PENDING" };
  }
}
