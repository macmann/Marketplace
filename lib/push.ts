import webpush from "web-push";
import type { Pool } from "pg";
import { pool } from "./db";
export function validateSubscription(input: unknown) {
  if (!input || typeof input !== "object") throw Error("Invalid subscription");
  const s = input as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  if (typeof s.endpoint !== "string" || s.endpoint.length > 2000)
    throw Error("Invalid endpoint");
  const url = new URL(s.endpoint);
  const allowed =
    url.hostname === "fcm.googleapis.com" ||
    url.hostname === "updates.push.services.mozilla.com" ||
    url.hostname === "web.push.apple.com" ||
    url.hostname.endsWith(".notify.windows.com");
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !allowed
  )
    throw Error("Unsupported push provider");
  if (
    typeof s.keys?.p256dh !== "string" ||
    !/^[A-Za-z0-9_-]{87}=?$/.test(s.keys.p256dh) ||
    typeof s.keys.auth !== "string" ||
    !/^[A-Za-z0-9_-]{22}={0,2}$/.test(s.keys.auth)
  )
    throw Error("Invalid keys");
  return {
    endpoint: s.endpoint,
    keys: { p256dh: s.keys.p256dh, auth: s.keys.auth },
  };
}
export async function deliverPush(
  db: Pool = pool,
  send?: (s: webpush.PushSubscription) => Promise<unknown>,
) {
  if (!send) {
    const {
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: privateKey,
      VAPID_SUBJECT: subject,
    } = process.env;
    if (!publicKey || !privateKey || !subject) return;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    send = (s) =>
      webpush.sendNotification(
        s,
        JSON.stringify({
          title: "Neighbour",
          body: "You have a new marketplace notification. Open Neighbour to read it.",
          url: "/account/notifications",
        }),
        { TTL: 3600, timeout: 5000 },
      );
  }
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    const { rows } = await c.query(
      `SELECT d.*,s.endpoint,s.p256dh,s.auth FROM push_deliveries d JOIN push_subscriptions s ON s.id=d.subscription_id JOIN notifications n ON n.id=d.notification_id AND n.user_id=s.user_id JOIN users u ON u.id=n.user_id WHERE d.next_attempt<=now() AND d.attempts<5 AND n.read_at IS NULL AND NOT u.suspended AND u.deleted_at IS NULL ORDER BY d.next_attempt LIMIT 20 FOR UPDATE OF d SKIP LOCKED`,
    );
    for (const row of rows) {
      try {
        const subscription = validateSubscription({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        });
        await send(subscription);
        await c.query(
          "DELETE FROM push_deliveries WHERE notification_id=$1 AND subscription_id=$2",
          [row.notification_id, row.subscription_id],
        );
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410)
          await c.query("DELETE FROM push_subscriptions WHERE id=$1", [
            row.subscription_id,
          ]);
        else
          await c.query(
            "UPDATE push_deliveries SET attempts=attempts+1,next_attempt=now()+power(2,attempts+1)*interval '1 minute' WHERE notification_id=$1 AND subscription_id=$2",
            [row.notification_id, row.subscription_id],
          );
      }
    }
    await c.query(
      "DELETE FROM push_deliveries d USING notifications n WHERE d.notification_id=n.id AND n.read_at IS NOT NULL",
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
