import { readFile } from "node:fs/promises";
import { pool } from "../lib/db";
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(742901)");
  await client.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  await client.query("COMMIT");
  console.log("Database schema ready.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
