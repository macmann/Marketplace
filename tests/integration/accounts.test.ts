import { maintenance } from "../../lib/maintenance";
import { pool as appPool } from "../../lib/db";
import { mkdir, writeFile, rm, access } from "node:fs/promises";
import path from "node:path";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomInt, createHash } from "node:crypto";
import { Pool } from "pg";
import { hash, compare } from "bcryptjs";
import { AccountService, AccountError } from "../../lib/account-service";
import type { VerificationProvider } from "../../lib/sms";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const userIds = new Set<string>();
const phoneIds = new Set<string>();
const tokens = new Set<string>();
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const phone = () => {
  const p = "+959" + randomInt(100000000, 999999999);
  phoneIds.add(p);
  return p;
};
class Provider implements VerificationProvider {
  calls = 0;
  starts = 0;
  failed = false;
  async start() {
    this.starts++;
    return randomUUID();
  }
  async check(_sid: string, code: string) {
    this.calls++;
    if (this.failed) throw Error("provider unavailable");
    return code === "123456";
  }
}
const provider = new Provider();
const service = new AccountService(db, provider);
const begin = async (...args: Parameters<AccountService["begin"]>) => {
  const token = await service.begin(...args);
  tokens.add(digest(token));
  return token;
};
async function user(
  options: {
    phone?: string;
    verified?: boolean;
    admin?: boolean;
    password?: string;
  } = {},
) {
  const {
    rows: [u],
  } = await db.query(
    "INSERT INTO users(email,name,password_hash,phone,phone_verified,role) VALUES($1,'Account fixture',$2,$3,$4,$5) RETURNING *",
    [
      "account-" + randomUUID() + "@example.test",
      await hash(options.password ?? "old-test-password", 12),
      options.phone ?? null,
      options.verified ?? false,
      options.admin ? "ADMIN" : "USER",
    ],
  );
  userIds.add(u.id);
  return u;
}
after(async () => {
  for (const p of phoneIds) {
    const { rows } = await db.query("SELECT id FROM users WHERE phone=$1", [p]);
    for (const r of rows) userIds.add(r.id);
    await db.query("DELETE FROM auth_challenges WHERE phone=$1", [p]);
  }
  await db.query(
    "DELETE FROM auth_challenges WHERE token_hash=ANY($1::text[])",
    [[...tokens]],
  );
  for (const id of userIds) {
    await db.query("DELETE FROM audit_logs WHERE actor_id=$1", [id]);
    await db.query("DELETE FROM listings WHERE seller_id=$1", [id]);
    await db.query("DELETE FROM users WHERE id=$1", [id]);
  }
  await db.end();
  await appPool.end();
});
test("phone OTP creates a verified account once and prevents challenge replay", async () => {
  const p = phone();
  const token = await begin("LOGIN", { phone: p, name: "Phone member" });
  const id = await service.complete(token, "LOGIN", "123456");
  userIds.add(id);
  const {
    rows: [u],
  } = await db.query("SELECT * FROM users WHERE id=$1", [id]);
  assert.equal(u.phone_verified, true);
  assert.equal(u.email, null);
  assert.equal(u.password_hash, null);
  assert.equal(u.name, "Phone member");
  await assert.rejects(
    service.complete(token, "LOGIN", "123456"),
    AccountError,
  );
  const again = await begin("LOGIN", {
    phone: p,
    name: "Cannot overwrite existing name",
  });
  assert.equal(await service.complete(again, "LOGIN", "123456"), id);
  assert.equal(
    (await db.query("SELECT name FROM users WHERE id=$1", [id])).rows[0].name,
    "Phone member",
  );
});
test("OTP challenges enforce purpose, actor, expiry and five attempts", async () => {
  const u = await user();
  const token = await begin("VERIFY", { phone: phone(), userId: u.id });
  await assert.rejects(
    service.complete(token, "LOGIN", "123456"),
    AccountError,
  );
  await assert.rejects(
    service.complete(token, "VERIFY", "123456", { userId: randomUUID() }),
    AccountError,
  );
  const before = provider.calls;
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      service.complete(token, "VERIFY", "000000", { userId: u.id }),
      AccountError,
    );
  await assert.rejects(
    service.complete(token, "VERIFY", "123456", { userId: u.id }),
    AccountError,
  );
  assert.equal(provider.calls - before, 5);
  const expired = await begin("LOGIN", { phone: phone() });
  await db.query(
    "UPDATE auth_challenges SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
    [digest(expired)],
  );
  await assert.rejects(
    service.complete(expired, "LOGIN", "123456"),
    AccountError,
  );
});
test("provider outage never authenticates and an OTP cannot attach another member’s phone", async () => {
  const owner = await user({ phone: phone(), verified: true });
  const other = await user();
  await assert.rejects(
    begin("VERIFY", { phone: owner.phone, userId: other.id }),
    AccountError,
  );
  const token = await begin("LOGIN", { phone: phone() });
  provider.failed = true;
  try {
    await assert.rejects(
      service.complete(token, "LOGIN", "123456"),
      AccountError,
    );
  } finally {
    provider.failed = false;
  }
});
test("concurrent completion consumes a challenge once", async () => {
  const token = await begin("LOGIN", { phone: phone() });
  const result = await Promise.allSettled([
    service.complete(token, "LOGIN", "123456"),
    service.complete(token, "LOGIN", "123456"),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  for (const r of result) if (r.status === "fulfilled") userIds.add(r.value);
});
test("recovery is single-use, resets password, and revokes every session", async () => {
  const u = await user({ phone: phone(), verified: true });
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day'),($3,$2,now()+interval '1 day')",
    [randomUUID(), u.id, randomUUID()],
  );
  const pendingLogin = await begin("LOGIN", { phone: u.phone });
  const token = await begin("RECOVER", { identifier: u.email });
  await assert.rejects(
    service.complete(token, "LOGIN", "123456"),
    AccountError,
  );
  assert.equal(
    await service.complete(token, "RECOVER", "123456", {
      password: "new-test-password",
    }),
    u.id,
  );
  await assert.rejects(
    service.complete(pendingLogin, "LOGIN", "123456"),
    AccountError,
  );
  assert.equal(
    await compare(
      "new-test-password",
      (await db.query("SELECT password_hash FROM users WHERE id=$1", [u.id]))
        .rows[0].password_hash,
    ),
    true,
  );
  assert.equal(
    (await db.query("SELECT * FROM sessions WHERE user_id=$1", [u.id]))
      .rowCount,
    0,
  );
  await assert.rejects(
    service.complete(token, "RECOVER", "123456", {
      password: "another-test-password",
    }),
    AccountError,
  );
});
test("unknown, unverified, and suspended accounts cannot recover or sign in", async () => {
  const unknown = await begin("RECOVER", {
    identifier: "missing-" + randomUUID() + "@example.test",
  });
  await assert.rejects(
    service.complete(unknown, "RECOVER", "123456", {
      password: "new-test-password",
    }),
    AccountError,
  );
  const u = await user({ phone: phone(), verified: false });
  const noRecovery = await begin("RECOVER", { identifier: u.email });
  await assert.rejects(
    service.complete(noRecovery, "RECOVER", "123456", {
      password: "new-test-password",
    }),
    AccountError,
  );
  await db.query("UPDATE users SET suspended=true WHERE id=$1", [u.id]);
  const token = await begin("LOGIN", { phone: u.phone });
  await assert.rejects(
    service.complete(token, "LOGIN", "123456"),
    AccountError,
  );
});
test("deletion requires recent auth or password and anonymizes data atomically", async () => {
  const u = await user({ phone: phone(), verified: true });
  const key = randomUUID() + ".webp";
  const {
    rows: [listing],
  } = await db.query(
    "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition) VALUES($1,'home','sanchaung','Private item','Contains private notes','FREE',0,'GOOD') RETURNING id",
    [u.id],
  );
  await db.query(
    "INSERT INTO listing_images(listing_id,storage_key,position) VALUES($1,$2,0)",
    [listing.id, key],
  );
  const session = randomUUID();
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,now()+interval '1 day',now()-interval '1 hour')",
    [session, u.id],
  );
  await assert.rejects(
    service.deleteAccount(u.id, session, "wrong-password"),
    AccountError,
  );
  assert.equal(
    (await db.query("SELECT email FROM users WHERE id=$1", [u.id])).rows[0]
      .email,
    u.email,
  );
  await service.deleteAccount(u.id, session, "old-test-password");
  const {
    rows: [deleted],
  } = await db.query("SELECT * FROM users WHERE id=$1", [u.id]);
  assert.equal(deleted.email, null);
  assert.equal(deleted.phone, null);
  assert.equal(deleted.password_hash, null);
  assert.equal(deleted.suspended, true);
  assert.ok(deleted.deleted_at);
  assert.equal(
    (await db.query("SELECT * FROM sessions WHERE user_id=$1", [u.id]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await db.query("SELECT status,description FROM listings WHERE id=$1", [
        listing.id,
      ])
    ).rows[0].status,
    "ARCHIVED",
  );
  assert.equal(
    (
      await db.query("SELECT * FROM listing_images WHERE listing_id=$1", [
        listing.id,
      ])
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await db.query("SELECT * FROM image_deletions WHERE storage_key=$1", [
        key,
      ])
    ).rowCount,
    1,
  );
  await db.query("DELETE FROM image_deletions WHERE storage_key=$1", [key]);
});

test("deletion protects the last administrator without affecting other accounts", async () => {
  const schema = "account_test_" + randomUUID().replace(/-/g, "");
  await db.query("CREATE SCHEMA " + schema);
  const scoped = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c search_path=" + schema,
  });
  try {
    await scoped.query("CREATE TABLE users (LIKE public.users INCLUDING ALL)");
    await scoped.query(
      "CREATE TABLE sessions (LIKE public.sessions INCLUDING ALL)",
    );
    const {
      rows: [admin],
    } = await scoped.query(
      "INSERT INTO users(email,name,password_hash,role) VALUES($1,'Only administrator',$2,'ADMIN') RETURNING id",
      ["only-admin@example.test", await hash("old-test-password", 12)],
    );
    const token = randomUUID();
    await scoped.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,now()+interval '1 day',now())",
      [token, admin.id],
    );
    const scopedService = new AccountService(scoped, provider);
    await assert.rejects(
      scopedService.deleteAccount(admin.id, token),
      (error: unknown) =>
        error instanceof AccountError && error.code === "lastAdmin",
    );
    assert.equal(
      (
        await scoped.query("SELECT deleted_at FROM users WHERE id=$1", [
          admin.id,
        ])
      ).rows[0].deleted_at,
      null,
    );
  } finally {
    await scoped.end();
    await db.query("DROP SCHEMA " + schema + " CASCADE");
  }
});

test("background image deletion removes files and keeps failures for retry", async () => {
  const key = randomUUID() + ".webp";
  const directory =
    process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  const target = path.join(directory, key);
  await mkdir(directory, { recursive: true });
  await mkdir(target);
  try {
    await db.query("INSERT INTO image_deletions(storage_key) VALUES($1)", [
      key,
    ]);
    await maintenance();
    assert.equal(
      (
        await db.query(
          "SELECT attempts FROM image_deletions WHERE storage_key=$1",
          [key],
        )
      ).rows[0].attempts,
      1,
    );
    await rm(target, { recursive: true });
    await writeFile(target, "temporary fixture");
    await maintenance();
    assert.equal(
      (
        await db.query("SELECT * FROM image_deletions WHERE storage_key=$1", [
          key,
        ])
      ).rowCount,
      0,
    );
    await assert.rejects(access(target));
  } finally {
    await rm(target, { recursive: true, force: true });
    await db.query("DELETE FROM image_deletions WHERE storage_key=$1", [key]);
  }
});

test("verified phone linking preserves email identity and phone sign-in returns that account", async () => {
  const u = await user();
  const p = phone();
  const token = await begin("VERIFY", { phone: p, userId: u.id });
  assert.equal(
    await service.complete(token, "VERIFY", "123456", { userId: u.id }),
    u.id,
  );
  const {
    rows: [verified],
  } = await db.query(
    "SELECT email,phone,phone_verified FROM users WHERE id=$1",
    [u.id],
  );
  assert.equal(verified.email, u.email);
  assert.equal(verified.phone, p);
  assert.equal(verified.phone_verified, true);
  const login = await begin("LOGIN", { phone: p });
  assert.equal(await service.complete(login, "LOGIN", "123456"), u.id);
});
