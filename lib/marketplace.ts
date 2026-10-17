import { query } from "./db";
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
      : "l.status IN ('ACTIVE','RESERVED') AND NOT u.suspended AND c.enabled",
  ];
  if (owner && publicOnly)
    where.push(
      "l.status IN ('ACTIVE','RESERVED') AND NOT u.suspended AND c.enabled",
    );
  if (saved)
    where.push(
      `EXISTS(SELECT 1 FROM favorites f WHERE f.listing_id=l.id AND f.user_id=${add(saved)})`,
    );
  if (filters.q) {
    const q = add(
      "%" + normalizeSearch(filters.q).replace(/[\\%_]/g, "\\$&") + "%",
    );
    where.push(
      `(l.title ILIKE ${q} OR l.description ILIKE ${q} OR c.name_en ILIKE ${q} OR c.name_my ILIKE ${q})`,
    );
  }
  if (filters.category) where.push(`l.category_id=${add(filters.category)}`);
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
        : "l.created_at DESC";
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
