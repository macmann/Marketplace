import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool } from "../lib/db";
if (!process.env.DATABASE_URL?.trim())
  throw Error("DATABASE_URL is required for migrations");
const client = await pool.connect().catch(async () => {
  await pool.end();
  throw Error(
    "Cannot connect to migration database; check DATABASE_URL and shared-service network access.",
  );
});
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(742901)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const directory = new URL("./migrations/", import.meta.url);
  for (const name of (await readdir(directory))
    .filter((n) => /^\d+_[a-z0-9_]+\.sql$/.test(n))
    .sort()) {
    const sql = await readFile(new URL(name, directory), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const {
      rows: [existing],
    } = await client.query(
      "SELECT checksum FROM schema_migrations WHERE name=$1",
      [name],
    );
    if (existing) {
      if (existing.checksum !== checksum)
        throw new Error("Applied migration has changed: " + name);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
      [name, checksum],
    );
    console.log("Applied migration: " + name);
  }
  await client.query("COMMIT");
  console.log("Database schema ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
