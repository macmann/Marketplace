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
import {
  accountSchema,
  listingSchema,
  uuid,
  canTransition,
} from "@/lib/validation";
import { saveImage, deleteImage } from "@/lib/storage";
const value = (f: FormData, k: string) => String(f.get(k) ?? "");
function fail(path: string, error: string): never {
  return redirect(path + "?error=" + encodeURIComponent(error));
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
async function twilio(path: string, data: Record<string, string>) {
  const {
    TWILIO_ACCOUNT_SID: a,
    TWILIO_AUTH_TOKEN: t,
    TWILIO_VERIFY_SERVICE_SID: s,
  } = process.env;
  if (!a || !t || !s) throw new Error("SMS verification is not configured.");
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${s}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(a + ":" + t).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok)
    throw new Error(
      "Verification provider unavailable. Check your number or try later.",
    );
  return res.json();
}
export async function requestOtp(f: FormData) {
  const u = await requireUser();
  const phone = value(f, "phone").replace(/\s/g, "");
  if (!/^\+959\d{7,10}$/.test(phone))
    fail("/verify", "Enter a Myanmar mobile number beginning +959.");
  try {
    await rateLimit("otp:" + u.id, 3, 600);
    const existing = await query(
      "SELECT id FROM users WHERE phone=$1 AND id<>$2",
      [phone, u.id],
    );
    if (existing.length)
      throw new Error("This phone number is already in use.");
    await twilio("Verifications", { To: phone, Channel: "sms" });
    (await cookies()).set("pending_phone", phone, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE !== "false",
      path: "/",
      maxAge: 600,
    });
  } catch (e) {
    fail("/verify", (e as Error).message);
  }
  redirect("/verify?sent=1");
}
export async function confirmOtp(f: FormData) {
  const u = await requireUser();
  const phone = (await cookies()).get("pending_phone")?.value;
  if (!phone) fail("/verify", "Request a new verification code.");
  const code = value(f, "code");
  if (!/^\d{4,10}$/.test(code)) fail("/verify", "Enter the verification code.");
  try {
    await rateLimit("otp-check:" + u.id, 8, 600);
    const result = await twilio("VerificationCheck", { To: phone, Code: code });
    if (result.status !== "approved")
      throw new Error("Incorrect or expired code.");
    await query("UPDATE users SET phone=$1,phone_verified=true WHERE id=$2", [
      phone,
      u.id,
    ]);
    (await cookies()).delete("pending_phone");
  } catch (e) {
    fail("/verify", (e as Error).message);
  }
  redirect("/sell");
}
export async function publish(f: FormData) {
  const u = await requireUser();
  if (!u.phone_verified) redirect("/verify");
  const parsed = listingSchema.safeParse(Object.fromEntries(f));
  if (!parsed.success) fail("/sell", parsed.error.issues[0].message);
  const a = parsed.data;
  const files = f
    .getAll("photos")
    .filter((x): x is File => x instanceof File && x.size > 0);
  if (files.length < 1 || files.length > 10)
    fail("/sell", "Add between 1 and 10 photos.");
  const keys: string[] = [];
  let id: string;
  try {
    await rateLimit("publish:" + u.id, 10, 86400);
    for (const file of files) keys.push(await saveImage(file));
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const valid = await client.query(
        "SELECT 1 FROM categories c,locations l WHERE c.id=$1 AND c.enabled AND l.id=$2 AND l.kind IN ('CITY','TOWNSHIP')",
        [a.category, a.location],
      );
      if (!valid.rowCount)
        throw new Error("Choose a valid category and location.");
      const r = await client.query(
        "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
        [
          u.id,
          a.category,
          a.location,
          a.title,
          a.description,
          a.type,
          a.type === "FREE" ? 0 : a.price,
          a.condition,
        ],
      );
      id = r.rows[0].id;
      for (const [i, key] of keys.entries())
        await client.query(
          "INSERT INTO listing_images(listing_id,storage_key,position) VALUES($1,$2,$3)",
          [id, key, i],
        );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    await Promise.allSettled(keys.map(deleteImage));
    fail(
      "/sell",
      (e as Error).message.includes("image")
        ? (e as Error).message
        : "Could not publish. Check your photos and try again.",
    );
  }
  revalidatePath("/");
  redirect("/listing/" + id!);
}
export async function favorite(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const visible = await query(
    "SELECT 1 FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1 AND l.status IN ('ACTIVE','RESERVED') AND NOT u.suspended",
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
    await query(
      "UPDATE listings SET status=$1,updated_at=now(),expires_at=CASE WHEN $1='ACTIVE' THEN now()+interval '60 days' ELSE expires_at END WHERE id=$2 AND status=$3",
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
    "SELECT l.* FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1 AND l.status IN ('ACTIVE','RESERVED') AND NOT u.suspended",
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
  redirect("/account/messages/" + c.id);
}
export async function sendMessage(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const body = value(f, "body").trim();
  if (!body || body.length > 2000) return;
  try {
    await rateLimit("message:" + u.id, u.phone_verified ? 30 : 5, 60);
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
  if (
    ![
      "Scam",
      "Counterfeit",
      "Prohibited item",
      "Misleading listing",
      "Spam",
      "Harassment",
      "Other",
    ].includes(reason)
  )
    return;
  await rateLimit("report:" + u.id, 10, 86400);
  await query(
    "INSERT INTO reports(reporter_id,listing_id,reason,detail) SELECT $1,id,$3,$4 FROM listings WHERE id=$2",
    [u.id, id, reason, value(f, "detail").slice(0, 2000)],
  );
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
  const u = await requireAdmin();
  const id = uuid.parse(value(f, "id"));
  const action = value(f, "action");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (action === "REMOVE" || action === "RESTORE")
      await client.query(
        "UPDATE listings SET status=$1,updated_at=now() WHERE id=$2",
        [action === "REMOVE" ? "REMOVED" : "ACTIVE", id],
      );
    else if (action === "SUSPEND" || action === "UNSUSPEND")
      await client.query(
        "UPDATE users SET suspended=$1 WHERE id=$2 AND role<>'ADMIN'",
        [action === "SUSPEND", id],
      );
    else if (action === "RESOLVE")
      await client.query("UPDATE reports SET status='RESOLVED' WHERE id=$1", [
        id,
      ]);
    else {
      await client.query("ROLLBACK");
      return;
    }
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,$2,$3)",
      [u.id, action, id],
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
export async function editListing(f: FormData) {
  const u = await requireUser();
  const id = uuid.parse(value(f, "id"));
  const parsed = listingSchema.safeParse(Object.fromEntries(f));
  if (!parsed.success) fail("/sell/" + id, parsed.error.issues[0].message);
  const a = parsed.data;
  const result = await query(
    `UPDATE listings SET title=$1,description=$2,category_id=$3,location_id=$4,listing_type=$5,price=$6,condition=$7,updated_at=now() WHERE id=$8 AND seller_id=$9 AND status IN ('ACTIVE','RESERVED','DRAFT','EXPIRED') AND EXISTS(SELECT 1 FROM categories WHERE id=$3 AND enabled) AND EXISTS(SELECT 1 FROM locations WHERE id=$4 AND kind IN ('CITY','TOWNSHIP')) RETURNING id`,
    [
      a.title,
      a.description,
      a.category,
      a.location,
      a.type,
      a.type === "FREE" ? 0 : a.price,
      a.condition,
      id,
      u.id,
    ],
  );
  if (!result.length) fail("/sell/" + id, "This listing cannot be edited.");
  revalidatePath("/", "layout");
  redirect("/account/listings");
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
  const allowedParents: Record<string, string> = {
    REGION: "COUNTRY",
    CITY: "REGION",
    TOWNSHIP: "CITY",
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
    if (p.rows[0]?.kind !== allowedParents[kind]) {
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
