import type { Pool, PoolClient } from "pg";
import type { Attribute } from "./listing-validation";
export async function attributeDefinitions(
  db: Pick<Pool, "query"> | PoolClient,
  category: string,
): Promise<Attribute[]> {
  if (!category) return [];
  return (
    await db.query(
      `WITH RECURSIVE ancestry AS (SELECT id,parent_id FROM categories WHERE id=$1 UNION ALL SELECT c.id,c.parent_id FROM categories c JOIN ancestry a ON c.id=a.parent_id) SELECT a.* FROM category_attributes a WHERE a.category_id IN (SELECT id FROM ancestry) AND a.enabled ORDER BY a.position,a.name_en,a.id`,
      [category],
    )
  ).rows;
}
