import { z } from "zod";
import { TRACK_IDS } from "@/lib/tracks";

export const memberSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^[+]?[0-9\s-]{6,20}$/, "Enter a valid phone number"),
  branchYear: z.string().trim().max(120).optional().default(""),
});

export const registerSchema = z
  .object({
    teamName: z.string().trim().min(2).max(80),
    institution: z.string().trim().min(2).max(160),
    city: z.string().trim().max(100).optional().default(""),
    trackId: z.enum(TRACK_IDS),
    projectIdea: z.string().trim().max(1000).optional().default(""),
    // UPI / bank reference the payer saw (optional — screenshot is the proof).
    paymentReference: z.string().trim().max(120).optional().default(""),
    members: z
      .array(memberSchema)
      .min(2, "Teams need 2–4 members")
      .max(4, "Teams need 2–4 members"),
    agreeRules: z.literal(true, {
      errorMap: () => ({ message: "You must accept the rules" }),
    }),
  })
  .refine((d) => new Set(d.members.map((m) => m.email.toLowerCase())).size === d.members.length, {
    message: "Member emails must be unique",
    path: ["members"],
  });

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  type: z.enum(["general", "sponsor", "mentor", "team"]),
  message: z.string().min(10).max(2000),
});

export const subscribeSchema = z.object({ email: z.string().email() });

export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
