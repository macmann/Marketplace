"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";
import { query, pool } from "@/lib/db";
import {
  requireUser,
  requireAdmin,
  currentUser,
  createSession,
  authRateLimit,
  rateLimit,
  digest,
} from "@/lib/auth";
import { accountSchema, uuid, canTransition } from "@/lib/validation";
import { recordMetric } from "@/lib/metrics";
import { reportReasons } from "@/lib/report-reasons";
import { createReport } from "@/lib/reporting";
import { moderation } from "@/lib/moderation";
import { requirePermission } from "@/lib/auth";
import { listingService } from "@/lib/listing-service";
const value = (f: FormData, k: string) => String(f.get(k) ?? "");
function fail(path: string, error: string): never {
  return redirect(
    path +
      (path === "/login" ? "?method=email&error=" : "?error=") +
      encodeURIComponent(error),
  );
}
export async function language() {
  const c = await cookies();
  c.set("locale", c.get("locale")?.value === "my" ? "en" : "my", {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
  });
  revalidatePath("/", "layout");
}
export async function register(f: FormData) {
  const parsed = accountSchema.safeParse(Object.fromEntries(f));
  if (!parsed.success)
    fail(
      "/register",
      "Enter a valid name, email, and password of 12–72 characters.",
    );
  const a = parsed.data;
  let id: string;
  try {
    await authRateLimit(a.email);
    const rows = await query(
      "INSERT INTO users(email,password_hash,name) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id",
      [a.email, await hash(a.password, 12), a.name],
    );
    if (!rows.length)
      fail(
        "/register",
        "Unable to create an account with these details. Try logging in.",
      );
    id = rows[0].id;
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    fail("/register", "Registration unavailable. Please try again later.");
  }
  await createSession(id);
  redirect("/account");
}
export async function login(f: FormData) {
  const email = value(f, "email").toLowerCase().trim();
  try {
    await authRateLimit(email);
  } catch {
    fail("/login", "Too many attempts. Try again later.");
  }
  const [u] = await query("SELECT * FROM users WHERE email=$1", [email]);
  const valid = await compare(
    value(f, "password"),
    u?.password_hash ??
      "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9wSa8UhUaRrYbtk3g.Qj6h1Z0qWzYMe",
  );
  if (!u || !valid || u.suspended)
    fail("/login", "Email or password is incorrect.");
  await createSession(u.id);
  redirect("/account");
}
export async function logout() {
  const c = await cookies();
  const token = c.get("market_session")?.value;
  if (token)
    await query("DELETE FROM sessions WHERE token_hash=$1", [digest(token)]);
  c.delete("market_session");
  redirect("/");
}
export async function favorite(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const visible = await query(
    "SELECT 1 FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1 AND l.status IN ('ACTIVE','RESERVED') AND l.expires_at>now() AND category_visible(l.category_id) AND NOT u.suspended",
    [id],
  );
  if (!visible.length) return;
  if (value(f, "saved") === "true")
    await query("DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2", [
      u.id,
      id,
    ]);
  else
    await query("INSERT INTO favorites VALUES($1,$2) ON CONFLICT DO NOTHING", [
      u.id,
      id,
    ]);
  revalidatePath("/", "layout");
}
export async function listingStatus(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const next = value(f, "status");
  const [l] = await query(
    "SELECT * FROM listings WHERE id=$1 AND seller_id=$2",
    [id, u.id],
  );
  if (l && canTransition(l.status, next)) {
    if (next === "ACTIVE") {
      try {
        await listingService.activate(u.id, id);
      } catch {
        const a = await import("@/lib/listing-i18n").then((m) =>
          m.listingCopy(),
        );
        fail("/account/listings", a.invalid);
      }
      revalidatePath("/", "layout");
      return;
    }
    await query(
      "UPDATE listings SET status=$1,revision=revision+1,updated_at=now(),expires_at=CASE WHEN $1='ACTIVE' THEN now()+interval '60 days' ELSE expires_at END WHERE id=$2 AND status=$3",
      [next, id, l.status],
    );
    revalidatePath("/", "layout");
  }
}
export async function startConversation(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  await rateLimit("conversation:" + u.id, 20, 3600);
  const [l] = await query(
    "SELECT l.* FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1 AND l.status IN ('ACTIVE','RESERVED') AND l.expires_at>now() AND category_visible(l.category_id) AND NOT u.suspended",
    [id],
  );
  if (!l || l.seller_id === u.id) redirect("/account/messages");
  const blocked = await query(
    "SELECT 1 FROM blocks WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1)",
    [u.id, l.seller_id],
  );
  if (blocked.length) redirect("/account/messages?error=Contact+is+blocked");
  const [c] = await query(
    "INSERT INTO conversations(listing_id,buyer_id,seller_id) VALUES($1,$2,$3) ON CONFLICT(listing_id,buyer_id) DO UPDATE SET listing_id=excluded.listing_id RETURNING id",
    [id, u.id, l.seller_id],
  );
  await recordMetric("CONTACT");
  redirect("/account/messages/" + c.id);
}
export async function sendMessage(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const body = value(f, "body").trim();
  if (!body || body.length > 2000) return;
  try {
    await rateLimit(
      "message:" + u.id,
      u.phone_verified || u.email_verified ? 30 : 5,
      60,
    );
  } catch {
    redirect("/account/messages/" + id + "?error=Too+many+messages");
  }
  await query(
    `INSERT INTO messages(conversation_id,sender_id,body) SELECT c.id,$1,$3 FROM conversations c JOIN users b ON b.id=c.buyer_id JOIN users s ON s.id=c.seller_id WHERE c.id=$2 AND (c.buyer_id=$1 OR c.seller_id=$1) AND NOT b.suspended AND NOT s.suspended AND NOT EXISTS(SELECT 1 FROM blocks WHERE (user_id=c.buyer_id AND blocked_id=c.seller_id) OR (user_id=c.seller_id AND blocked_id=c.buyer_id))`,
    [u.id, id, body],
  );
  revalidatePath("/account/messages/" + id);
}
export async function blockUser(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "user"));
  if (id !== u.id) {
    if (value(f, "remove") === "true")
      await query("DELETE FROM blocks WHERE user_id=$1 AND blocked_id=$2", [
        u.id,
        id,
      ]);
    else
      await query("INSERT INTO blocks VALUES($1,$2) ON CONFLICT DO NOTHING", [
        u.id,
        id,
      ]);
  }
  revalidatePath("/account", "layout");
}
export async function reportListing(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const reason = value(f, "reason");
  if (!reportReasons.includes(reason as (typeof reportReasons)[number])) return;
  await rateLimit("report:" + u.id, 10, 86400);
  await createReport(u.id, "listing", id, reason, value(f, "detail"));
  redirect("/listing/" + id + "?reported=1");
}
export async function updateProfile(f: FormData) {
  const u = await requireUser();
  const name = value(f, "name").trim();
  if (name.length >= 2 && name.length <= 80)
    await query("UPDATE users SET name=$1 WHERE id=$2", [name, u.id]);
  revalidatePath("/account");
}
export async function moderate(f: FormData) {
  const u = await requirePermission("support");
  try {
    await moderation.act(
      u.id,
      uuid.parse(value(f, "id")),
      value(f, "action"),
      value(f, "note"),
      f.has("revision") ? Number(value(f, "revision")) : undefined,
    );
  } catch (e) {
    redirect(
      "/admin?error=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Unable to moderate",
        ),
    );
  }
  revalidatePath("/", "layout");
}
export async function manageCategory(f: FormData) {
  const u = await requireAdmin();
  const id = value(f, "id");
  const en = value(f, "en").trim(),
    my = value(f, "my").trim();
  const parent = value(f, "parent") || null;
  if (
    !/^[a-z0-9-]{1,60}$/.test(id) ||
    !en ||
    !my ||
    en.length > 100 ||
    my.length > 100 ||
    parent === id
  )
    return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(742902)");
    if (parent) {
      const cycle = await client.query(
        "WITH RECURSIVE descendants AS (SELECT id FROM categories WHERE id=$1 UNION ALL SELECT c.id FROM categories c JOIN descendants d ON c.parent_id=d.id) SELECT 1 FROM descendants WHERE id=$2",
        [id, parent],
      );
      if (cycle.rowCount) {
        await client.query("ROLLBACK");
        return;
      }
    }
    await client.query(
      "INSERT INTO categories(id,name_en,name_my,parent_id,position,enabled) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name_en=excluded.name_en,name_my=excluded.name_my,parent_id=excluded.parent_id,position=excluded.position,enabled=excluded.enabled",
      [
        id,
        en,
        my,
        parent,
        Math.max(0, Math.min(10000, Number(value(f, "position")) || 0)),
        f.get("enabled") === "on",
      ],
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'CATEGORY_UPDATE',$2)",
      [u.id, id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
}
export async function manageLocation(f: FormData) {
  const u = await requireAdmin();
  const id = value(f, "id");
  const en = value(f, "en").trim(),
    my = value(f, "my").trim(),
    kind = value(f, "kind"),
    parent = value(f, "parent") || null;
  const allowedParents: Record<string, string[]> = {
    REGION: ["COUNTRY"],
    DISTRICT: ["REGION"],
    CITY: ["REGION"],
    TOWNSHIP: ["CITY", "DISTRICT"],
  };
  if (
    !/^[a-z0-9-]{1,60}$/.test(id) ||
    !en ||
    !my ||
    en.length > 100 ||
    my.length > 100 ||
    !Object.keys(allowedParents).includes(kind) ||
    parent === id
  )
    return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const p = await client.query("SELECT kind FROM locations WHERE id=$1", [
      parent,
    ]);
    if (!allowedParents[kind].includes(p.rows[0]?.kind)) {
      await client.query("ROLLBACK");
      return;
    }
    const existing = await client.query(
      "SELECT kind FROM locations WHERE id=$1",
      [id],
    );
    if (existing.rowCount && existing.rows[0].kind !== kind) {
      await client.query("ROLLBACK");
      return;
    }
    await client.query(
      "INSERT INTO locations(id,name_en,name_my,parent_id,kind) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name_en=excluded.name_en,name_my=excluded.name_my,parent_id=excluded.parent_id",
      [id, en, my, parent, kind],
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'LOCATION_UPDATE',$2)",
      [u.id, id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
}

export async function reportTarget(f: FormData) {
  const u = await requireUser();
  await rateLimit("report:" + u.id, 10, 86400);
  try {
    await createReport(
      u.id,
      value(f, "kind"),
      uuid.parse(value(f, "id")),
      value(f, "reason"),
      value(f, "detail"),
    );
  } catch {
    redirect("/account/messages?error=Unable+to+submit+report");
  }
  redirect("/account/messages?reported=1");
}
