import { z } from "zod";
import { listingSchema } from "./validation";
export type Attribute = {
  id: string;
  category_id: string;
  key: string;
  name_en: string;
  name_my: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM" | "DATE";
  choices: string[];
  required: boolean;
  enabled: boolean;
  position: number;
};
export type ListingPayload = {
  title: string;
  description: string;
  category: string;
  location: string;
  type: "SALE" | "FREE";
  price: string;
  condition: string;
  attributes: Record<string, string>;
};
export const emptyPayload: ListingPayload = {
  title: "",
  description: "",
  category: "",
  location: "",
  type: "SALE",
  price: "",
  condition: "GOOD",
  attributes: {},
};
export const draftSchema = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(5000),
  category: z.string().max(80),
  location: z.string().max(80),
  type: z.enum(["SALE", "FREE"]),
  price: z
    .string()
    .max(20)
    .refine((x) => x === "" || /^\d{1,12}$/.test(x)),
  condition: z.enum([
    "NEW",
    "LIKE_NEW",
    "GOOD",
    "FAIR",
    "POOR",
    "NOT_SPECIFIED",
  ]),
  attributes: z.record(z.uuid(), z.string().max(500)),
});
export type ListingErrorCode =
  | "invalid"
  | "photoCount"
  | "photoOwnership"
  | "conflict"
  | "notFound"
  | "phoneRequired"
  | "invalidAttribute"
  | "requiredAttribute"
  | "attributeChanged"
  | "uploadFailed";
export class ListingError extends Error {
  constructor(public code: ListingErrorCode) {
    super(code);
  }
}
export function validatePayload(
  payload: unknown,
  publish: boolean,
): ListingPayload {
  const normalized =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "type" in payload &&
    payload.type === "FREE"
      ? { ...payload, price: "0" }
      : payload;
  const parsed = draftSchema.safeParse(normalized);
  if (!parsed.success) throw new ListingError("invalid");
  const p = parsed.data;
  if (p.type === "FREE") p.price = "0";
  if (publish && !listingSchema.safeParse(p).success)
    throw new ListingError("invalid");
  return p;
}
export function validateAttributes(
  input: Record<string, string>,
  definitions: Attribute[],
  publish: boolean,
) {
  const result: Record<string, string | number | boolean> = {};
  const known = new Set(definitions.map((d) => d.id));
  for (const key of Object.keys(input))
    if (!known.has(key) && input[key] !== "")
      throw new ListingError("invalidAttribute");
  for (const d of definitions) {
    const v = (input[d.id] ?? "").trim();
    if (!v) {
      if (publish && d.required) throw new ListingError("requiredAttribute");
      continue;
    }
    switch (d.type) {
      case "TEXT":
        result[d.id] = v;
        break;
      case "NUMBER":
        if (
          !/^-?\d+(\.\d+)?$/.test(v) ||
          !Number.isFinite(Number(v)) ||
          Math.abs(Number(v)) > 1e12
        )
          throw new ListingError("invalidAttribute");
        result[d.id] = Number(v);
        break;
      case "BOOLEAN":
        if (!["true", "false"].includes(v))
          throw new ListingError("invalidAttribute");
        result[d.id] = v === "true";
        break;
      case "ENUM":
        if (!d.choices.includes(v)) throw new ListingError("invalidAttribute");
        result[d.id] = v;
        break;
      case "DATE":
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          !Number.isFinite(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v
        )
          throw new ListingError("invalidAttribute");
        result[d.id] = v;
        break;
    }
  }
  return result;
}
export function validatePhotoOrder(
  order: unknown,
  existingIds: string[],
  uploadCount: number,
  publish: boolean,
) {
  if (
    !Array.isArray(order) ||
    order.length > 10 ||
    order.some((x) => typeof x !== "string") ||
    new Set(order).size !== order.length
  )
    throw new ListingError("photoCount");
  const allowed = new Set([
    ...existingIds,
    ...Array.from({ length: uploadCount }, (_, i) => "new:" + i),
  ]);
  if (order.some((x) => !allowed.has(x)))
    throw new ListingError("photoOwnership");
  if (publish && order.length < 1) throw new ListingError("photoCount");
  if (
    Array.from({ length: uploadCount }, (_, i) => "new:" + i).some(
      (id) => !order.includes(id),
    )
  )
    throw new ListingError("photoCount");
  return order as string[];
}
