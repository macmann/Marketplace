import { test } from "node:test";
import assert from "node:assert/strict";
import { redisSettings } from "../lib/redis-config";
test("shared Redis configuration scopes BullMQ keys, preserves TLS/database selection and decodes credentials", () => {
  const settings = redisSettings({
    REDIS_URL:
      "rediss://member%40app:secret%3Avalue@shared.example.test:6380/2",
    REDIS_KEY_PREFIX: "marketplace-prod:",
  });
  assert.equal(settings.prefix, "marketplace-prod");
  assert.equal(settings.queueName, "maintenance");
  assert.equal(settings.connection.username, "member@app");
  assert.equal(settings.connection.password, "secret:value");
  assert.equal(settings.connection.db, 2);
  assert.deepEqual(settings.connection.tls, {});
  assert.equal(settings.connection.maxRetriesPerRequest, null);
  assert.equal(settings.connection.retryStrategy(100), 5000);
  assert.equal(
    redisSettings({ REDIS_URL: "redis://local/0" }).prefix,
    "marketplace",
  );
  for (const env of [
    {},
    { REDIS_URL: "http://wrong" },
    { REDIS_URL: "redis://local/not-a-db" },
    { REDIS_URL: "redis://local", REDIS_KEY_PREFIX: "" },
    { REDIS_URL: "redis://local", REDIS_KEY_PREFIX: "other:app" },
  ])
    assert.throws(() => redisSettings(env));
});
