export function redisSettings(
  env: Record<string, string | undefined> = process.env,
) {
  if (!env.REDIS_URL) throw Error("REDIS_URL is required");
  let url: URL;
  try {
    url = new URL(env.REDIS_URL);
  } catch {
    throw Error("REDIS_URL must be a Redis connection URL");
  }
  if (
    !["redis:", "rediss:"].includes(url.protocol) ||
    !url.hostname ||
    !/^\/?\d*$/.test(url.pathname)
  )
    throw Error("Invalid REDIS_URL configuration");
  const prefix = (env.REDIS_KEY_PREFIX ?? "marketplace")
    .trim()
    .replace(/:+$/, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(prefix))
    throw Error("REDIS_KEY_PREFIX must be a nonempty application namespace");
  let username: string | undefined, password: string | undefined;
  try {
    username = url.username ? decodeURIComponent(url.username) : undefined;
    password = url.password ? decodeURIComponent(url.password) : undefined;
  } catch {
    throw Error("Invalid REDIS_URL credentials encoding");
  }
  const db = Number(url.pathname.replace(/^\//, "") || 0);
  if (!Number.isSafeInteger(db) || db < 0)
    throw Error("Invalid Redis database number");
  return {
    prefix,
    queueName: "maintenance",
    connection: {
      host: url.hostname,
      port: Number(url.port || 6379),
      username,
      password,
      db,
      ...(url.protocol === "rediss:" ? { tls: {} } : {}),
      connectTimeout: 10000,
      maxRetriesPerRequest: null,
      retryStrategy: (attempt: number) => Math.min(attempt * 250, 5000),
    },
  };
}
