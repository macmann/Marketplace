import { deliverPush } from "../lib/push";
import { Queue, Worker } from "bullmq";
import { pool } from "../lib/db";
import { maintenance } from "../lib/maintenance";
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
const cleanup = maintenance;
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
let heartbeatBusy = false;
const heartbeat = async () => {
  const client = await queue.client;
  if (client.status !== "ready") throw Error("Redis unavailable");
  await client.get("neighbour:health");
  await pool.query(
    "INSERT INTO service_heartbeats(name,last_seen) VALUES('worker',now()) ON CONFLICT(name) DO UPDATE SET last_seen=now()",
  );
};
await heartbeat();
const heartbeatTimer = setInterval(() => {
  if (heartbeatBusy) return;
  heartbeatBusy = true;
  heartbeat()
    .then(() => deliverPush())
    .catch(() =>
      console.error(JSON.stringify({ event: "heartbeat_or_push_failed" })),
    )
    .finally(() => {
      heartbeatBusy = false;
    });
}, 30000);
console.log(JSON.stringify({ event: "worker_ready" }));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    clearInterval(heartbeatTimer);
    while (heartbeatBusy)
      await new Promise((resolve) => setTimeout(resolve, 50));
    await worker.close();
    await queue.close();
    await pool.end();
    process.exit(0);
  });
