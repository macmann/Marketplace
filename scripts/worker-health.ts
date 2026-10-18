import { pool } from "../lib/db";
try {
  const {
    rows: [r],
  } = await pool.query(
    "SELECT last_seen>now()-interval '2 minutes' healthy FROM service_heartbeats WHERE name='worker'",
  );
  process.exitCode = r?.healthy ? 0 : 1;
} catch {
  process.exitCode = 1;
} finally {
  await pool.end();
}
