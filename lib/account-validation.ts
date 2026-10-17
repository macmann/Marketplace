import { z } from "zod";
export function normalizePhone(input: string) {
  const clean = input.trim().replace(/[\s()-]/g, "");
  const phone = clean.startsWith("09") ? "+95" + clean.slice(1) : clean;
  return /^\+959\d{7,10}$/.test(phone) ? phone : null;
}
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must be at most 72 UTF-8 bytes.",
  );
export const otpCodeSchema = z.string().regex(/^\d{4,10}$/);
export const displayNameSchema = z.string().trim().min(2).max(80);
export type Purpose = "LOGIN" | "VERIFY" | "RECOVER";
export const challengeCookie: Record<Purpose, string> = {
  LOGIN: "phone_login_challenge",
  VERIFY: "phone_verify_challenge",
  RECOVER: "password_recovery_challenge",
};
