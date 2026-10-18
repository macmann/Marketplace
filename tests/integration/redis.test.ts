import { test } from "node:test";
import assert from "node:assert/strict";
import { Queue, Worker, QueueEvents } from "bullmq";
import { randomUUID } from "node:crypto";
import { redisSettings } from "../../lib/redis-config";
import { spawnSync } from "node:child_process";
test("identical BullMQ queue/job names in two prefixes remain isolated and unrelated Redis data survives cleanup", async () => {
  const settings = redisSettings(),
    a = "marketplace-test-" + randomUUID(),
    b = "marketplace-test-" + randomUUID();
  const one = new Queue("maintenance", {
      connection: settings.connection,
      prefix: a,
    }),
    two = new Queue("maintenance", {
      connection: settings.connection,
      prefix: b,
    });
  const events = new QueueEvents("maintenance", {
    connection: settings.connection,
    prefix: a,
  });
  const worker = new Worker("maintenance", async (job) => job.data.value, {
    connection: settings.connection,
    prefix: a,
  });
  const client = await one.client,
    key = "other-app-test:" + randomUUID();
  try {
    await client.set(key, "untouched");
    await events.waitUntilReady();
    await worker.waitUntilReady();
    const second = await two.add(
      "cleanup",
      { value: "two" },
      { jobId: "same-id" },
    );
    const first = await one.add(
      "cleanup",
      { value: "one" },
      { jobId: "same-id" },
    );
    assert.equal(await first.waitUntilFinished(events, 10000), "one");
    assert.equal(await second.getState(), "waiting");
    assert.ok(one.toKey("same-id").startsWith(a + ":"));
    assert.ok(two.toKey("same-id").startsWith(b + ":"));
    await worker.close();
    await one.obliterate({ force: true });
    assert.equal(await second.getState(), "waiting");
    assert.equal(await client.get(key), "untouched");
  } finally {
    await worker.close();
    await events.close();
    await client.del(key);
    await one.obliterate({ force: true });
    await two.obliterate({ force: true });
    await one.close();
    await two.close();
  }
});
test(
  "missing migration URL and unreachable Redis fail clearly without printing credentials",
  { timeout: 25000 },
  () => {
    const missing = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/migrate.ts"],
      {
        env: { ...process.env, DATABASE_URL: "" },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /DATABASE_URL is required/);
    const unavailable = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/worker.ts"],
      {
        env: {
          ...process.env,
          REDIS_URL: "redis://fixture-user:do-not-print-this@127.0.0.1:1/0",
          REDIS_KEY_PREFIX: "marketplace-unavailable-test",
        },
        encoding: "utf8",
        timeout: 22000,
      },
    );
    assert.equal(unavailable.status, 1);
    assert.match(unavailable.stderr, /worker_startup_failed/);
    assert.doesNotMatch(unavailable.stderr, /do-not-print-this/);
  },
);
