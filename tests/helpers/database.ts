import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
export async function isolatedDatabase() {
  const root = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = "fixture_" + randomUUID().replace(/-/g, "");
  await root.query("CREATE SCHEMA " + schema);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("options", "-c search_path=" + schema + ",public");
  const db = new Pool({ connectionString: url.toString() });
  try {
    for (const file of (await readdir("scripts/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.query(await readFile("scripts/migrations/" + file, "utf8"));
  } catch (e) {
    await db.end();
    await root.query("DROP SCHEMA " + schema + " CASCADE");
    await root.end();
    throw e;
  }
  return {
    db,
    async close() {
      await db.end();
      await root.query("DROP SCHEMA " + schema + " CASCADE");
      await root.end();
    },
  };
}
