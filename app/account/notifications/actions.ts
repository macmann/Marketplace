"use server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
export async function readNotifications() {
  const u = await requireUser();
  await query(
    "UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL",
    [u.id],
  );
  revalidatePath("/account/notifications");
}
export async function pushConfiguration() {
  await requireUser();
  return process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
    ? process.env.VAPID_PUBLIC_KEY
    : "";
}
export async function subscribePush(input: unknown) {
  const u = await requireUser();
  const { validateSubscription } = await import("@/lib/push");
  const { rateLimit } = await import("@/lib/auth");
  await rateLimit("push:" + u.id, 20, 3600);
  if (!(await pushConfiguration())) throw Error("Push unavailable");
  const s = validateSubscription(input);
  await query(
    "INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth",
    [u.id, s.endpoint, s.keys.p256dh, s.keys.auth],
  );
}
export async function unsubscribePush(endpoint: string) {
  const u = await requireUser();
  await query(
    "DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2",
    [u.id, endpoint],
  );
}
