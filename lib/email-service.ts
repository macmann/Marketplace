import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import type { Pool } from "pg";
import { pool } from "./db";
import { AccountError } from "./account-service";
import { normalizePhone, passwordSchema } from "./account-validation";
import { SmtpEmailProvider, type EmailProvider } from "./email";
export const emailAddress = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const emailCookies = {
  VERIFY: "email_verify_challenge",
  RECOVER: "email_recovery_challenge",
} as const;
type Purpose = keyof typeof emailCookies;
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const emailCodeHash = (token: string, code: string) =>
  createHmac("sha256", token).update(code).digest("hex");
export class EmailService {
  constructor(
    private db: Pool,
    private provider: EmailProvider,
  ) {}
  async beginVerify(
    userId: string,
    input: string,
    proof: { sessionHash?: string; password?: string } = {},
  ) {
    const parsed = emailAddress.safeParse(input.trim());
    if (!parsed.success) throw new AccountError("invalid");
    const email = parsed.data;
    const user = (
      await this.db.query(
        "SELECT email,password_hash FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL",
        [userId],
      )
    ).rows[0];
    // Adding a first email is supported; replacing an existing login/recovery
    // address requires a separate account-change workflow.
    if (!user || (user.email && user.email !== email))
      throw new AccountError("notAllowed");
    if (!user.email) {
      const session = (
        await this.db.query(
          "SELECT authenticated_at>now()-interval '15 minutes' recent FROM sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now()",
          [proof.sessionHash ?? "", userId],
        )
      ).rows[0];
      if (
        !session ||
        (!session.recent &&
          (!user.password_hash ||
            !proof.password ||
            !(await compare(proof.password, user.password_hash))))
      )
        throw new AccountError("password");
    }
    return this.issue("VERIFY", userId, email);
  }
  async beginRecovery(identifier: string) {
    const value = identifier.trim().toLowerCase().slice(0, 254);
    const user = (
      await this.db.query(
        "SELECT id,email FROM users WHERE (email=$1 OR phone=$2) AND email_verified AND NOT suspended AND deleted_at IS NULL",
        [value, normalizePhone(value)],
      )
    ).rows[0];
    return this.issue("RECOVER", user?.id ?? null, user?.email ?? null);
  }
  private async issue(
    purpose: Purpose,
    userId: string | null,
    email: string | null,
  ) {
    const token = randomBytes(32).toString("hex"),
      code = String(randomInt(100000, 1000000));
    const c = await this.db.connect();
    try {
      await c.query("BEGIN");
      if (userId) {
        const user = (
          await c.query(
            "SELECT email,email_verified FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL FOR UPDATE",
            [userId],
          )
        ).rows[0];
        if (
          !user ||
          (purpose === "RECOVER" &&
            (!user.email_verified || user.email !== email)) ||
          (purpose === "VERIFY" && user.email && user.email !== email)
        )
          throw new AccountError("notAllowed");
        await c.query(
          "UPDATE email_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL",
          [userId, purpose],
        );
      }
      await c.query(
        "INSERT INTO email_challenges(token_hash,code_hash,purpose,user_id,email) VALUES($1,$2,$3,$4,$5)",
        [digest(token), emailCodeHash(token, code), purpose, userId, email],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    if (email) {
      try {
        await this.provider.send(email, code, purpose);
      } catch {
        await this.db.query(
          "UPDATE email_challenges SET consumed_at=now() WHERE token_hash=$1",
          [digest(token)],
        );
        if (purpose === "VERIFY") throw new AccountError("unavailable");
      }
    }
    return token;
  }
  async complete(
    token: string,
    purpose: Purpose,
    code: string,
    options: { userId?: string; password?: string } = {},
  ) {
    if (!/^[a-f0-9]{64}$/.test(token) || !/^\d{6}$/.test(code))
      throw new AccountError("invalid");
    const passwordHash =
      purpose === "RECOVER"
        ? await hash(passwordSchema.parse(options.password), 12)
        : null;
    const snapshot = (
      await this.db.query(
        "SELECT user_id FROM email_challenges WHERE token_hash=$1 AND purpose=$2",
        [digest(token), purpose],
      )
    ).rows[0];
    if (!snapshot?.user_id) throw new AccountError("invalid");
    const c = await this.db.connect();
    let failure = false;
    try {
      await c.query("BEGIN");
      const user = (
        await c.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [
          snapshot.user_id,
        ])
      ).rows[0];
      const challenge = (
        await c.query(
          "SELECT * FROM email_challenges WHERE token_hash=$1 AND purpose=$2 FOR UPDATE",
          [digest(token), purpose],
        )
      ).rows[0];
      if (
        !user ||
        user.suspended ||
        user.deleted_at ||
        !challenge ||
        challenge.consumed_at ||
        new Date(challenge.expires_at) <= new Date() ||
        challenge.attempts >= 5 ||
        (purpose === "VERIFY" && challenge.user_id !== options.userId)
      )
        throw new AccountError("invalid");
      await c.query(
        "UPDATE email_challenges SET attempts=attempts+1 WHERE token_hash=$1",
        [digest(token)],
      );
      if (
        !timingSafeEqual(
          Buffer.from(challenge.code_hash, "hex"),
          Buffer.from(emailCodeHash(token, code), "hex"),
        )
      )
        failure = true;
      else {
        if (purpose === "VERIFY") {
          if (
            (user.email && user.email !== challenge.email) ||
            (
              await c.query("SELECT 1 FROM users WHERE email=$1 AND id<>$2", [
                challenge.email,
                user.id,
              ])
            ).rowCount
          )
            throw new AccountError("notAllowed");
          await c.query(
            "UPDATE users SET email=$1,email_verified=true WHERE id=$2",
            [challenge.email, user.id],
          );
        } else {
          if (!user.email_verified || user.email !== challenge.email)
            throw new AccountError("invalid");
          await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
            passwordHash,
            user.id,
          ]);
          await c.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
          await c.query(
            "UPDATE auth_challenges SET consumed_at=now() WHERE (user_id=$1 OR phone=$2) AND consumed_at IS NULL",
            [user.id, user.phone],
          );
        }
        await c.query(
          "UPDATE email_challenges SET consumed_at=now() WHERE user_id=$1 AND (purpose=$2 OR $2='RECOVER') AND consumed_at IS NULL",
          [user.id, purpose],
        );
      }
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      if ((e as { code?: string }).code === "23505")
        throw new AccountError("notAllowed");
      throw e;
    } finally {
      c.release();
    }
    if (failure) throw new AccountError("invalid");
    return snapshot.user_id as string;
  }
}
export const emails = new EmailService(pool, new SmtpEmailProvider());
