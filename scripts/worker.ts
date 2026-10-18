import { mediaWorker } from "../lib/media-worker";
import { deliverPush } from "../lib/push";
import { Queue, Worker } from "bullmq";
import { pool } from "../lib/db";
import { maintenance } from "../lib/maintenance";
import { redisSettings } from "../lib/redis-config";
let settings: ReturnType<typeof redisSettings>;
try {
  settings = redisSettings();
} catch (error) {
  console.error(
    JSON.stringify({
      event: "worker_configuration_invalid",
      message: (error as Error).message,
    }),
  );
  process.exit(1);
}
const { connection, prefix, queueName } = settings;
const queue = new Queue(queueName, { connection, prefix });
queue.on("error", () =>
  console.error(JSON.stringify({ event: "queue_connection_error" })),
);
const redisDeadline = setTimeout(() => {
  console.error(
    JSON.stringify({
      event: "worker_startup_failed",
      message:
        "Redis initialization timed out; check REDIS_URL and shared-service network access.",
    }),
  );
  process.exit(1);
}, 15000);
try {
  await queue.upsertJobScheduler(
    "hourly-maintenance",
    { every: 3600000 },
    { name: "cleanup", opts: { removeOnComplete: 24, removeOnFail: 50 } },
  );
  const cleanup = maintenance;
  const worker = new Worker(queueName, cleanup, {
    connection,
    prefix,
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
  await worker.waitUntilReady();
  clearTimeout(redisDeadline);
  await cleanup();
  let heartbeatBusy = false;
  const heartbeat = async () => {
    const client = await queue.client;
    if (client.status !== "ready") throw Error("Redis unavailable");
    await client.get(prefix + ":service-health");
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
  let mediaBusy = false;
  const mediaTimer = setInterval(() => {
    if (mediaBusy) return;
    mediaBusy = true;
    mediaWorker
      .images(2)
      .then(() => mediaWorker.moderation(2))
      .catch(() =>
        console.error(JSON.stringify({ event: "media_automation_failed" })),
      )
      .finally(() => {
        mediaBusy = false;
      });
  }, 3000);
  console.log(JSON.stringify({ event: "worker_ready" }));
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, async () => {
      clearInterval(heartbeatTimer);
      clearInterval(mediaTimer);
      while (heartbeatBusy || mediaBusy)
        await new Promise((resolve) => setTimeout(resolve, 50));
      await worker.close();
      await queue.close();
      await pool.end();
      process.exit(0);
    });
} catch {
  clearTimeout(redisDeadline);
  console.error(
    JSON.stringify({
      event: "worker_startup_failed",
      message:
        "Check DATABASE_URL, REDIS_URL and shared-service network access.",
    }),
  );
  process.exit(1);
}
