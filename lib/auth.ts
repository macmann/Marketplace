import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { permits, type Permission } from "./permissions";
import { query } from "./db";
export type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  role: string;
  suspended: boolean;
};
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("market_session")?.value;
  if (!token) return null;
  return (
    (
      await query<User>(
        "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.suspended AND u.deleted_at IS NULL",
        [digest(token)],
      )
    )[0] ?? null
  );
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
export async function requirePermission(permission: Permission) {
  const u = await requireUser();
  if (!permits(u.role, permission)) redirect("/");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/");
  return u;
}
export async function createSession(id: string) {
  const token = randomBytes(32).toString("hex");
  await query(
    "INSERT INTO sessions(token_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,now()+interval '30 days',now())",
    [digest(token), id],
  );
  (await cookies()).set("market_session", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: 2592000,
  });
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const [r] = await query(
    `INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.hits+1 END, reset_at=CASE WHEN rate_limits.reset_at<now() THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING hits`,
    [key, seconds],
  );
  if (r.hits > limit)
    throw new Error("Too many attempts. Please try again later.");
}
export async function authRateLimit(email: string) {
  await rateLimit("auth:" + digest(email.toLowerCase()), 10, 900);
  const h = await headers();
  /* Coolify must overwrite X-Forwarded-For. */ const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  await rateLimit("auth-ip:" + digest(ip), 50, 900);
}
