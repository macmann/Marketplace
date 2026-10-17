import { z } from "zod";
import { passwordSchema } from "./account-validation";
export const listingSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(5000),
    category: z.string().min(1).max(80),
    location: z.string().min(1).max(80),
    type: z.enum(["SALE", "FREE"]),
    price: z.coerce.number().int().min(0).max(999999999999),
    condition: z.enum([
      "NEW",
      "LIKE_NEW",
      "GOOD",
      "FAIR",
      "POOR",
      "NOT_SPECIFIED",
    ]),
  })
  .refine((x) => x.type !== "SALE" || x.price > 0, {
    message: "Sale listings need a price greater than zero",
    path: ["price"],
  });
export const accountSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  password: passwordSchema,
  name: z.string().trim().min(2).max(80),
});
export const uuid = z.uuid();
export const transitions: Record<string, string[]> = {
  ACTIVE: ["RESERVED", "SOLD", "ARCHIVED"],
  RESERVED: ["ACTIVE", "SOLD", "ARCHIVED"],
  DRAFT: ["ACTIVE", "ARCHIVED"],
  EXPIRED: ["ACTIVE", "ARCHIVED"],
};
export function canTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}
export function normalizeSearch(s: string) {
  return s.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 100);
}
