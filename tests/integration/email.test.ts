import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { compare } from "bcryptjs";
import { isolatedDatabase } from "../helpers/database";
import { EmailService } from "../../lib/email-service";
import { AccountService } from "../../lib/account-service";
import { ListingService } from "../../lib/listing-service";
import { emptyPayload } from "../../lib/listing-validation";
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>;
const delivered: { email: string; code: string; purpose: string }[] = [];
let service: EmailService;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const create = async (email: string | null = null) =>
  (
    await fixture.db.query(
      "INSERT INTO users(name,email) VALUES('Email fixture',$1) RETURNING *",
      [email],
    )
  ).rows[0];
const last = () => delivered.at(-1)!;
const proof = async (userId: string) => {
  const sessionHash = digest(randomUUID());
  await fixture.db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,now()+interval '1 day',now())",
    [sessionHash, userId],
  );
  return { sessionHash };
};
before(async () => {
  fixture = await isolatedDatabase();
  service = new EmailService(fixture.db, {
    send: async (email, code, purpose) => {
      delivered.push({ email, code, purpose });
    },
  });
});
after(async () => {
  await fixture.close();
});
test("email ownership is proven, actor/purpose bound, one-use, and never grants phone verification", async () => {
  const u = await create("email-" + randomUUID() + "@example.test"),
    other = await create();
  const token = await service.beginVerify(u.id, u.email.toUpperCase());
  const { code } = last();
  assert.equal(last().email, u.email);
  const challenge = (
    await fixture.db.query(
      "SELECT * FROM email_challenges WHERE token_hash=$1",
      [digest(token)],
    )
  ).rows[0];
  assert.notEqual(challenge.code_hash, code);
  assert.notEqual(challenge.code_hash, digest(code));
  await assert.rejects(
    service.complete(token, "VERIFY", code, { userId: other.id }),
  );
  await assert.rejects(
    service.complete(token, "RECOVER", code, {
      password: "a-secure-password-123",
    }),
  );
  await service.complete(token, "VERIFY", code, { userId: u.id });
  const result = (
    await fixture.db.query("SELECT * FROM users WHERE id=$1", [u.id])
  ).rows[0];
  assert.equal(result.email_verified, true);
  assert.equal(result.phone_verified, false);
  await assert.rejects(
    service.complete(token, "VERIFY", code, { userId: u.id }),
  );
  await assert.rejects(service.beginVerify(u.id, "different@example.test"));
});
test("resend invalidates old codes; expiry and five guesses are enforced", async () => {
  const u = await create("bounds-" + randomUUID() + "@example.test");
  const old = await service.beginVerify(u.id, u.email),
    oldCode = last().code;
  const next = await service.beginVerify(u.id, u.email),
    code = last().code;
  await assert.rejects(
    service.complete(old, "VERIFY", oldCode, { userId: u.id }),
  );
  const wrong = code === "100000" ? "100001" : "100000";
  for (let n = 0; n < 5; n++)
    await assert.rejects(
      service.complete(next, "VERIFY", wrong, { userId: u.id }),
    );
  await assert.rejects(
    service.complete(next, "VERIFY", code, { userId: u.id }),
  );
  const expired = await service.beginVerify(u.id, u.email),
    expiredCode = last().code;
  await fixture.db.query(
    "UPDATE email_challenges SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
    [digest(expired)],
  );
  await assert.rejects(
    service.complete(expired, "VERIFY", expiredCode, { userId: u.id }),
  );
});
test("only verified active contacts recover; successful recovery signs out every session and invalidates both channels", async () => {
  const unverified = await create(
    "unverified-" + randomUUID() + "@example.test",
  );
  const count = delivered.length;
  for (const identifier of [unverified.email, "unknown@example.test"]) {
    const t = await service.beginRecovery(identifier);
    await assert.rejects(
      service.complete(t, "RECOVER", "123456", {
        password: "new-password-12345",
      }),
    );
  }
  assert.equal(delivered.length, count);
  const u = await create("recover-" + randomUUID() + "@example.test");
  const verify = await service.beginVerify(u.id, u.email);
  await service.complete(verify, "VERIFY", last().code, { userId: u.id });
  await fixture.db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [digest("session-" + u.id), u.id],
  );
  await fixture.db.query(
    "INSERT INTO auth_challenges(token_hash,purpose,user_id) VALUES($1,'RECOVER',$2)",
    [digest("sms-" + u.id), u.id],
  );
  const token = await service.beginRecovery(u.email),
    code = last().code;
  const results = await Promise.allSettled([
    service.complete(token, "RECOVER", code, {
      password: "new-password-12345",
    }),
    service.complete(token, "RECOVER", code, {
      password: "new-password-12345",
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (await fixture.db.query("SELECT * FROM sessions WHERE user_id=$1", [u.id]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await fixture.db.query(
        "SELECT * FROM auth_challenges WHERE user_id=$1 AND consumed_at IS NULL",
        [u.id],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    await compare(
      "new-password-12345",
      (
        await fixture.db.query("SELECT password_hash FROM users WHERE id=$1", [
          u.id,
        ])
      ).rows[0].password_hash,
    ),
    true,
  );
  await fixture.db.query("UPDATE users SET suspended=true WHERE id=$1", [u.id]);
  const sent = delivered.length;
  await service.beginRecovery(u.email);
  assert.equal(delivered.length, sent);
});
test("provider outages never verify or recover, and a phone account can link a unique first email", async () => {
  const u = await create();
  const address = "linked-" + randomUUID() + "@example.test";
  await assert.rejects(service.beginVerify(u.id, address), /password/);
  const token = await service.beginVerify(u.id, address, await proof(u.id));
  const code = last().code;
  await service.complete(token, "VERIFY", code, { userId: u.id });
  const attacker = await create();
  const collision = await service.beginVerify(
      attacker.id,
      address,
      await proof(attacker.id),
    ),
    collisionCode = last().code;
  await assert.rejects(
    service.complete(collision, "VERIFY", collisionCode, {
      userId: attacker.id,
    }),
  );
  const fail = new EmailService(fixture.db, {
    send: async () => {
      throw Error("SMTP outage");
    },
  });
  await assert.rejects(fail.beginVerify(u.id, address));
  const recovery = await fail.beginRecovery(address);
  await assert.rejects(
    fail.complete(recovery, "RECOVER", "123456", {
      password: "new-password-12345",
    }),
  );
});
test("email verification permits real giveaway publication without a phone, and deletion clears email proof and challenges", async () => {
  const u = await create("giveaway-" + randomUUID() + "@example.test");
  await fixture.db.query(
    "INSERT INTO categories(id,name_en,name_my) VALUES('home','Home','အိမ်') ON CONFLICT DO NOTHING",
  );
  await fixture.db.query(
    "INSERT INTO locations(id,name_en,name_my,kind) VALUES('local','Local','နေရာ','TOWNSHIP') ON CONFLICT DO NOTHING",
  );
  const listings = new ListingService(fixture.db, {
    save: async () => randomUUID() + ".webp",
    remove: async () => {},
  });
  const command = {
    kind: "draft" as const,
    revision: 0,
    mode: "publish" as const,
    payload: {
      ...emptyPayload,
      title: "Email-only giveaway",
      description: "A free chair to collect locally.",
      category: "home",
      location: "local",
      type: "FREE" as const,
    },
    photoOrder: ["new:0"],
    uploads: [new File(["fixture"], "photo.jpg", { type: "image/jpeg" })],
  };
  await assert.rejects(listings.save(u.id, command), /phoneRequired/);
  const token = await service.beginVerify(u.id, u.email);
  await service.complete(token, "VERIFY", last().code, { userId: u.id });
  const result = await listings.save(u.id, command);
  assert.equal(result.kind, "listing");
  await service.beginRecovery(u.email);
  const session = digest("delete-" + u.id);
  await fixture.db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,now()+interval '1 day',now())",
    [session, u.id],
  );
  await new AccountService(fixture.db, {
    start: async () => "unused",
    check: async () => false,
  }).deleteAccount(u.id, session);
  const deleted = (
    await fixture.db.query(
      "SELECT email,email_verified FROM users WHERE id=$1",
      [u.id],
    )
  ).rows[0];
  assert.equal(deleted.email, null);
  assert.equal(deleted.email_verified, false);
  assert.equal(
    (
      await fixture.db.query(
        "SELECT 1 FROM email_challenges WHERE user_id=$1",
        [u.id],
      )
    ).rowCount,
    0,
  );
});
