import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const ls = await query(
    "SELECT l.id,l.updated_at FROM listings l JOIN users u ON u.id=l.seller_id JOIN categories c ON c.id=l.category_id WHERE l.status='ACTIVE' AND NOT u.suspended AND c.enabled ORDER BY l.updated_at DESC LIMIT 10000",
  );
  return [
    { url: base },
    { url: base + "/free" },
    ...ls.map((l) => ({
      url: base + "/listing/" + l.id,
      lastModified: l.updated_at,
    })),
  ];
}
