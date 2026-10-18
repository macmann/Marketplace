import type { PoolClient, Pool } from "pg";
import { pool } from "./db";
import { attributeDefinitions } from "./attributes";
import { validatePayload, validateAttributes } from "./listing-validation";
import { normalizeIndex } from "./myanmar-text";
import { permits } from "./permissions";
export async function reviewReasons(
  db: PoolClient,
  owner: string,
  id: string,
  title: string,
  description: string,
) {
  const reasons: string[] = [];
  const settings = await db.query(
    "SELECT review_all FROM marketplace_settings WHERE id=true",
  );
  if (settings.rows[0]?.review_all) reasons.push("Manual review policy");
  const rules = await db.query(
    "SELECT phrase FROM moderation_rules WHERE enabled",
  );
  const text = normalizeIndex(title + " " + description);
  for (const rule of rules.rows)
    if (text.includes(normalizeIndex(rule.phrase)))
      reasons.push("Text rule: " + rule.phrase);
  const duplicates = await db.query(
    "SELECT 1 FROM listings WHERE seller_id=$1 AND id<>$2 AND status IN ('ACTIVE','RESERVED','PENDING_REVIEW') AND lower(normalize(title,NFC))=lower(normalize($3,NFC)) AND lower(normalize(description,NFC))=lower(normalize($4,NFC)) LIMIT 1",
    [owner, id, title, description],
  );
  if (duplicates.rowCount) reasons.push("Possible duplicate listing");
  return reasons;
}
export class ModerationService {
  constructor(private db: Pool = pool) {}
  async act(
    actor: string,
    id: string,
    action: string,
    note: string,
    expectedRevision?: number,
  ) {
    if (
      ![
        "REMOVE",
        "RESTORE",
        "APPROVE",
        "REJECT",
        "SUSPEND",
        "UNSUSPEND",
        "RESOLVE",
        "DISMISS",
      ].includes(action)
    )
      throw Error("Invalid action");
    if (note.length > 1000) throw Error("Reason is too long");
    const c = await this.db.connect();
    try {
      await c.query("BEGIN");
      // Serializes staff changes and protects last-admin/account deletion lock ordering.
      await c.query("SELECT pg_advisory_xact_lock(742903)");
      const {
        rows: [u],
      } = await c.query(
        "SELECT role FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL FOR SHARE",
        [actor],
      );
      const resolving = ["RESOLVE", "DISMISS"].includes(action);
      if (!u || !permits(u.role, resolving ? "support" : "moderate"))
        throw Error("Forbidden");
      if (!note.trim() && !["RESTORE", "UNSUSPEND", "RESOLVE"].includes(action))
        throw Error("A reason is required");
      let result;
      if (resolving)
        result = await c.query(
          "UPDATE reports SET status=$1,resolved_by=$2,resolved_at=now(),resolution=$3 WHERE id=$4 AND status='OPEN' RETURNING id",
          [
            action === "RESOLVE" ? "RESOLVED" : "DISMISSED",
            actor,
            note.trim(),
            id,
          ],
        );
      else if (["SUSPEND", "UNSUSPEND"].includes(action)) {
        result = await c.query(
          "UPDATE users SET suspended=$1 WHERE id=$2 AND role='USER' AND deleted_at IS NULL RETURNING id",
          [action === "SUSPEND", id],
        );
        if (action === "SUSPEND" && result.rowCount)
          await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
      } else {
        const {
          rows: [l],
        } = await c.query(
          "SELECT l.*,u.suspended,u.deleted_at,u.phone_verified,u.email_verified,category_visible(c.id) enabled FROM listings l JOIN users u ON u.id=l.seller_id JOIN categories c ON c.id=l.category_id WHERE l.id=$1 FOR UPDATE OF l",
          [id],
        );
        if (!l) throw Error("Listing not found");
        if (expectedRevision !== undefined && l.revision !== expectedRevision)
          throw Error("Listing changed. Review the latest version.");
        const next =
          action === "REMOVE"
            ? "REMOVED"
            : action === "REJECT"
              ? "REJECTED"
              : action === "RESTORE"
                ? (l.removed_from ?? "PENDING_REVIEW")
                : "ACTIVE";
        if (
          ["APPROVE", "REJECT"].includes(action) &&
          l.status !== "PENDING_REVIEW"
        )
          throw Error("Listing is no longer pending review");
        if (action === "RESTORE" && l.status !== "REMOVED")
          throw Error("Only removed listings can be restored");
        if (action === "REMOVE" && l.status === "REMOVED")
          throw Error("Listing is already removed");
        if (["ACTIVE", "RESERVED"].includes(next)) {
          if (
            l.suspended ||
            l.deleted_at ||
            (!l.phone_verified && !l.email_verified) ||
            !l.enabled ||
            new Date(l.expires_at) <= new Date()
          )
            throw Error("Seller, category or expiry prevents publication");
          const images = await c.query(
            "SELECT processing_state FROM listing_images WHERE listing_id=$1",
            [id],
          );
          if (!images.rowCount || images.rowCount > 10)
            throw Error("Listing needs 1–10 photos");
          if (
            images.rows.some((i) => i.processing_state !== "READY") ||
            l.automation_state === "PENDING"
          )
            throw Error("automation_pending");
          const attrs = await c.query(
            "SELECT attribute_id,value FROM listing_attribute_values WHERE listing_id=$1",
            [id],
          );
          validatePayload(
            {
              title: l.title,
              description: l.description,
              category: l.category_id,
              location: l.location_id,
              type: l.listing_type,
              price: String(l.price),
              condition: l.condition,
              attributes: {},
            },
            true,
          );
          validateAttributes(
            Object.fromEntries(
              attrs.rows.map((r) => [r.attribute_id, String(r.value)]),
            ),
            await attributeDefinitions(c, l.category_id),
            true,
          );
        }
        result = await c.query(
          "UPDATE listings SET status=$1,automation_state=CASE WHEN $3 IN ('APPROVE','REJECT','REMOVE','RESTORE') THEN 'OVERRIDDEN' ELSE automation_state END,removed_from=CASE WHEN $3='REMOVE' THEN status ELSE removed_from END,revision=revision+1,updated_at=now() WHERE id=$2 RETURNING id",
          [next, id, action],
        );
      }
      if (!result.rowCount) throw Error("Record was changed or is unavailable");
      await c.query(
        "INSERT INTO audit_logs(actor_id,action,entity_id,detail) VALUES($1,$2,$3,$4)",
        [actor, action, id, note.trim()],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
export const moderation = new ModerationService();
