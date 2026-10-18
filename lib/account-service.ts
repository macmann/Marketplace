import { randomBytes, createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { compare, hash } from "bcryptjs";
import { pool } from "./db";
import {
  normalizePhone,
  passwordSchema,
  displayNameSchema,
  otpCodeSchema,
  type Purpose,
} from "./account-validation";
import { TwilioVerificationProvider, type VerificationProvider } from "./sms";
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
export class AccountError extends Error {
  constructor(
    public code:
      | "invalid"
      | "unavailable"
      | "phoneUsed"
      | "notAllowed"
      | "password"
      | "lastAdmin",
  ) {
    super(code);
  }
}
export class AccountService {
  constructor(
    private db: Pool,
    private provider: VerificationProvider,
  ) {}
  async begin(
    purpose: Purpose,
    input: {
      phone?: string;
      name?: string;
      identifier?: string;
      userId?: string;
    },
  ) {
    let phone = normalizePhone(input.phone ?? "");
    let userId = input.userId ?? null;
    if (purpose === "RECOVER") {
      const identifier = (input.identifier ?? "")
        .trim()
        .toLowerCase()
        .slice(0, 254);
      const {
        rows: [user],
      } = await this.db.query(
        "SELECT id,phone FROM users WHERE (email=$1 OR phone=$2) AND phone_verified AND NOT suspended AND deleted_at IS NULL",
        [identifier, normalizePhone(identifier)],
      );
      phone = user?.phone ?? null;
      userId = user?.id ?? null;
    } else if (!phone) throw new AccountError("invalid");
    if (purpose === "VERIFY") {
      const {
        rows: [user],
      } = await this.db.query(
        "SELECT id FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL",
        [userId],
      );
      if (!user) throw new AccountError("notAllowed");
      const { rowCount } = await this.db.query(
        "SELECT id FROM users WHERE phone=$1 AND id<>$2",
        [phone, userId],
      );
      if (rowCount) throw new AccountError("phoneUsed");
    }
    const name =
      purpose === "LOGIN"
        ? displayNameSchema.parse(input.name || "ZaySine")
        : null;
    const token = randomBytes(32).toString("hex");
    let sid: string | null = null;
    if (phone) {
      try {
        sid = await this.provider.start(phone);
      } catch {
        if (purpose !== "RECOVER") throw new AccountError("unavailable");
      }
    }
    await this.db.query(
      "INSERT INTO auth_challenges(token_hash,purpose,user_id,phone,display_name,verification_sid) VALUES($1,$2,$3,$4,$5,$6)",
      [digest(token), purpose, userId, phone, name, sid],
    );
    return token;
  }
  async complete(
    token: string,
    purpose: Purpose,
    code: string,
    options: { userId?: string; password?: string } = {},
  ) {
    if (!/^[a-f0-9]{64}$/.test(token) || !otpCodeSchema.safeParse(code).success)
      throw new AccountError("invalid");
    const passwordHash =
      purpose === "RECOVER"
        ? await hash(passwordSchema.parse(options.password), 12)
        : null;
    const snapshot = (
      await this.db.query(
        "SELECT user_id,phone FROM auth_challenges WHERE token_hash=$1 AND purpose=$2",
        [digest(token), purpose],
      )
    ).rows[0];
    const client = await this.db.connect();
    let userId: string | undefined;
    let failure: AccountError | undefined;
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM users WHERE id=$1 OR phone=$2 ORDER BY id FOR UPDATE",
        [snapshot?.user_id ?? null, snapshot?.phone ?? null],
      );
      const {
        rows: [c],
      } = await client.query(
        "SELECT * FROM auth_challenges WHERE token_hash=$1 AND purpose=$2 FOR UPDATE",
        [digest(token), purpose],
      );
      if (
        !c ||
        c.consumed_at ||
        new Date(c.expires_at).getTime() <= Date.now() ||
        c.attempts >= 5 ||
        (purpose === "VERIFY" && c.user_id !== options.userId)
      ) {
        await client.query("ROLLBACK");
        throw new AccountError("invalid");
      }
      await client.query(
        "UPDATE auth_challenges SET attempts=attempts+1 WHERE token_hash=$1",
        [digest(token)],
      );
      let approved = false;
      try {
        approved =
          !!c.verification_sid &&
          (await this.provider.check(c.verification_sid, code));
      } catch {
        failure = new AccountError("unavailable");
      }
      if (!approved) failure ??= new AccountError("invalid");
      else {
        await client.query(
          "UPDATE auth_challenges SET consumed_at=now() WHERE token_hash=$1",
          [digest(token)],
        );
        if (purpose === "LOGIN") {
          const {
            rows: [u],
          } = await client.query(
            "INSERT INTO users(name,phone,phone_verified) VALUES($1,$2,true) ON CONFLICT(phone) DO UPDATE SET phone_verified=true WHERE NOT users.suspended AND users.deleted_at IS NULL RETURNING id",
            [c.display_name, c.phone],
          );
          userId = u?.id;
        } else if (purpose === "VERIFY") {
          const conflict = await client.query(
            "SELECT id FROM users WHERE phone=$1 AND id<>$2",
            [c.phone, c.user_id],
          );
          if (conflict.rowCount) failure = new AccountError("phoneUsed");
          else {
            const {
              rows: [u],
            } = await client.query(
              "UPDATE users SET phone=$1,phone_verified=true WHERE id=$2 AND NOT suspended AND deleted_at IS NULL RETURNING id",
              [c.phone, c.user_id],
            );
            userId = u?.id;
          }
        } else {
          const {
            rows: [u],
          } = await client.query(
            "UPDATE users SET password_hash=$1 WHERE id=$2 AND phone=$3 AND phone_verified AND NOT suspended AND deleted_at IS NULL RETURNING id",
            [passwordHash, c.user_id, c.phone],
          );
          userId = u?.id;
          if (userId) {
            await client.query("DELETE FROM sessions WHERE user_id=$1", [
              userId,
            ]);
            await client.query(
              "UPDATE email_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL",
              [userId],
            );
            await client.query(
              "UPDATE auth_challenges SET consumed_at=now() WHERE (user_id=$1 OR phone=$2) AND consumed_at IS NULL",
              [userId, c.phone],
            );
          }
        }
        if (!userId) failure ??= new AccountError("notAllowed");
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    if (failure) throw failure;
    return userId!;
  }
  async deleteAccount(userId: string, sessionHash: string, password?: string) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(742903)");
      const {
        rows: [u],
      } = await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [
        userId,
      ]);
      if (!u || u.suspended || u.deleted_at)
        throw new AccountError("notAllowed");
      await this.requireRecent(
        client,
        userId,
        sessionHash,
        u.password_hash,
        password,
      );
      if (u.role === "ADMIN") {
        await client.query("SELECT pg_advisory_xact_lock(742903)");
        const { rowCount } = await client.query(
          "SELECT id FROM users WHERE role='ADMIN' AND id<>$1 AND NOT suspended AND deleted_at IS NULL",
          [userId],
        );
        if (!rowCount) throw new AccountError("lastAdmin");
      }
      await client.query(
        "INSERT INTO image_deletions(storage_key) SELECT i.storage_key FROM listing_images i LEFT JOIN listings l ON l.id=i.listing_id LEFT JOIN listing_drafts d ON d.id=i.draft_id WHERE l.seller_id=$1 OR d.seller_id=$1 ON CONFLICT DO NOTHING",
        [userId],
      );
      await client.query(
        "DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE seller_id=$1) OR draft_id IN (SELECT id FROM listing_drafts WHERE seller_id=$1)",
        [userId],
      );
      await client.query("DELETE FROM listing_drafts WHERE seller_id=$1", [
        userId,
      ]);
      await client.query(
        "DELETE FROM listing_attribute_values WHERE listing_id IN (SELECT id FROM listings WHERE seller_id=$1)",
        [userId],
      );
      await client.query(
        "UPDATE listings SET status='ARCHIVED',title='Deleted listing',description='',search_title='',search_text='',moderation_reasons='[]',updated_at=now() WHERE seller_id=$1",
        [userId],
      );
      await client.query(
        "UPDATE messages SET body='[Message removed]' WHERE sender_id=$1",
        [userId],
      );
      await client.query(
        "DELETE FROM favorites WHERE user_id=$1 OR listing_id IN (SELECT id FROM listings WHERE seller_id=$1)",
        [userId],
      );
      await client.query(
        "DELETE FROM blocks WHERE user_id=$1 OR blocked_id=$1",
        [userId],
      );
      await client.query("UPDATE reports SET detail='' WHERE reporter_id=$1", [
        userId,
      ]);
      await client.query("DELETE FROM push_subscriptions WHERE user_id=$1", [
        userId,
      ]);
      await client.query("DELETE FROM notifications WHERE user_id=$1", [
        userId,
      ]);
      await client.query("DELETE FROM sessions WHERE user_id=$1", [userId]);
      await client.query(
        "DELETE FROM auth_challenges WHERE user_id=$1 OR phone=$2",
        [userId, u.phone],
      );
      await client.query("DELETE FROM email_challenges WHERE user_id=$1", [
        userId,
      ]);
      await client.query(
        "UPDATE users SET name='Deleted account',email=NULL,phone=NULL,password_hash=NULL,phone_verified=false,email_verified=false,suspended=true,deleted_at=now() WHERE id=$1",
        [userId],
      );
      await client.query(
        "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'ACCOUNT_DELETED',$2)",
        [userId, userId],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  private async requireRecent(
    client: PoolClient,
    userId: string,
    sessionHash: string,
    storedHash: string | null,
    password?: string,
  ) {
    const {
      rows: [session],
    } = await client.query(
      "SELECT authenticated_at>now()-interval '15 minutes' recent FROM sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now()",
      [sessionHash, userId],
    );
    if (!session) throw new AccountError("notAllowed");
    if (
      !session.recent &&
      (!storedHash || !password || !(await compare(password, storedHash)))
    )
      throw new AccountError("password");
  }
}
export const accounts = new AccountService(
  pool,
  new TwilioVerificationProvider(),
);
