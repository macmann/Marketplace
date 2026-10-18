import { searchAlternatives, fuzzyEnglish } from "./search";
import { query } from "./db";
import { attributeDefinitions } from "./attributes";
import { pool } from "./db";
import { normalizeSearch } from "./validation";
export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: string;
  listing_type: string;
  condition: string;
  status: string;
  created_at: string;
  category_en: string;
  category_my: string;
  location_en: string;
  location_my: string;
  image: string | null;
  seller_name: string;
  phone_verified: boolean;
};
export const listingSelect = `SELECT l.*, c.name_en category_en,c.name_my category_my,loc.name_en location_en,loc.name_my location_my,u.name seller_name,u.phone_verified,(SELECT storage_key FROM listing_images WHERE listing_id=l.id ORDER BY position LIMIT 1) image FROM listings l JOIN categories c ON c.id=l.category_id JOIN locations loc ON loc.id=l.location_id JOIN users u ON u.id=l.seller_id`;
export async function catalog(
  filters: Record<string, string | undefined>,
  owner?: string,
  saved?: string,
  publicOnly = false,
) {
  const values: unknown[] = [];
  const add = (v: unknown) => {
    values.push(v);
    return "$" + values.length;
  };
  const where = [
    owner
      ? `l.seller_id=${add(owner)}`
      : "l.status IN ('ACTIVE','RESERVED') AND l.expires_at>now() AND NOT u.suspended AND category_visible(l.category_id)",
  ];
  if (owner && publicOnly)
    where.push(
      "l.status IN ('ACTIVE','RESERVED') AND l.expires_at>now() AND NOT u.suspended AND category_visible(l.category_id)",
    );
  if (saved)
    where.push(
      `EXISTS(SELECT 1 FROM favorites f WHERE f.listing_id=l.id AND f.user_id=${add(saved)})`,
    );
  let relevance = "";
  if (filters.q) {
    const terms = normalizeSearch(filters.q)
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .slice(0, 10);
    for (const term of terms) {
      const alternatives = searchAlternatives(term).map((word) => {
        const q = add("%" + word.replace(/[\\%_]/g, "\\$&") + "%");
        const clauses = [
          `lower(normalize(l.title,NFC)) LIKE ${q}`,
          `lower(normalize(l.description,NFC)) LIKE ${q}`,
          `lower(normalize(c.name_en,NFC)) LIKE ${q}`,
          `normalize(c.name_my,NFC) LIKE ${q}`,
        ];
        if (fuzzyEnglish(word))
          clauses.push(
            `word_similarity(${add(word)},lower(normalize(l.title,NFC)))>=0.5`,
          );
        return "(" + clauses.join(" OR ") + ")";
      });
      where.push("(" + alternatives.join(" OR ") + ")");
    }
    const exact = add(normalizeSearch(filters.q).toLowerCase());
    relevance = `(CASE WHEN lower(normalize(l.title,NFC))=${exact} THEN 3 WHEN strpos(lower(normalize(l.title,NFC)),${exact})>0 THEN 2 ELSE 1 END) DESC,`;
  }
  if (filters.category) {
    where.push(
      `l.category_id IN (WITH RECURSIVE descendants AS (SELECT id FROM categories WHERE id=${add(filters.category)} AND enabled UNION ALL SELECT c.id FROM categories c JOIN descendants d ON c.parent_id=d.id WHERE c.enabled) SELECT id FROM descendants)`,
    );
    const definitions = await attributeDefinitions(pool, filters.category);
    for (const field of definitions) {
      const raw = filters["attr_" + field.id];
      if (raw === undefined || raw === "") continue;
      let value: string | number | boolean = raw.slice(0, 500);
      if (field.type === "NUMBER") {
        if (!Number.isFinite(Number(raw))) {
          where.push("false");
          continue;
        }
        value = Number(raw);
      }
      if (field.type === "BOOLEAN") {
        if (!["true", "false"].includes(raw)) {
          where.push("false");
          continue;
        }
        value = raw === "true";
      }
      where.push(
        `EXISTS(SELECT 1 FROM listing_attribute_values v WHERE v.listing_id=l.id AND v.attribute_id=${add(field.id)} AND v.value=${add(JSON.stringify(value))}::jsonb)`,
      );
    }
  }
  if (filters.location)
    where.push(
      `l.location_id IN (WITH RECURSIVE descendants AS (SELECT id FROM locations WHERE id=${add(filters.location)} UNION ALL SELECT x.id FROM locations x JOIN descendants d ON x.parent_id=d.id) SELECT id FROM descendants)`,
    );
  if (["FREE", "SALE"].includes(filters.type ?? ""))
    where.push(`l.listing_type=${add(filters.type)}`);
  if (filters.condition) where.push(`l.condition=${add(filters.condition)}`);
  for (const [key, op] of [
    ["min", ">="],
    ["max", "<="],
  ])
    if (filters[key] && Number.isFinite(Number(filters[key])))
      where.push(
        `l.price ${op} ${add(Math.max(0, Math.min(999999999999, Number(filters[key]))))}`,
      );
  const sort =
    filters.sort === "low"
      ? "l.price ASC,l.created_at DESC"
      : filters.sort === "high"
        ? "l.price DESC,l.created_at DESC"
        : (filters.sort === "newest" ? "" : relevance) +
          "l.created_at DESC,l.id DESC";
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(filters.page)) || 1),
  );
  return query<Listing>(
    `${listingSelect} WHERE ${where.join(" AND ")} ORDER BY ${sort} LIMIT 25 OFFSET ${add((page - 1) * 24)}`,
    values,
  );
}
export async function options() {
  return {
    categories: await query(
      "SELECT * FROM categories WHERE enabled ORDER BY position,name_en",
    ),
    locations: await query(
      "SELECT * FROM locations WHERE kind IN ('CITY','TOWNSHIP') ORDER BY name_en",
    ),
  };
}
