import { Queue, Worker } from "bullmq";
import { query, pool } from "../lib/db";
const u = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host: u.hostname,
  port: Number(u.port || 6379),
  password: u.password || undefined,
  username: u.username || undefined,
  ...(u.protocol === "rediss:" ? { tls: {} } : {}),
};
const queue = new Queue("maintenance", { connection });
await queue.upsertJobScheduler(
  "hourly-maintenance",
  { every: 3600000 },
  { name: "cleanup", opts: { removeOnComplete: 24, removeOnFail: 50 } },
);
const cleanup = async () => {
  await query(
    "UPDATE listings SET status='EXPIRED',updated_at=now() WHERE status='ACTIVE' AND expires_at<now()",
  );
  await query("DELETE FROM sessions WHERE expires_at<now()");
  await query("DELETE FROM rate_limits WHERE reset_at<now()-interval '1 day'");
};
const worker = new Worker("maintenance", cleanup, {
  connection,
  concurrency: 1,
});
worker.on("failed", (_job, error) =>
  console.error(
    JSON.stringify({ event: "maintenance_failed", message: error.message }),
  ),
);
worker.on("error", (error) =>
  console.error(
    JSON.stringify({ event: "worker_error", message: error.message }),
  ),
);
await cleanup();
console.log(JSON.stringify({ event: "worker_ready" }));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await worker.close();
    await queue.close();
    await pool.end();
    process.exit(0);
  });
