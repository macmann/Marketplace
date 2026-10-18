import { normalizeIndex } from "./myanmar-text";
import { reviewReasons } from "./moderation";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { pool } from "./db";
import { saveImage, deleteImage } from "./storage";
import {
  ListingError,
  validatePayload,
  validateAttributes,
  validatePhotoOrder,
  type ListingPayload,
} from "./listing-validation";
export { attributeDefinitions } from "./attributes";
import { attributeDefinitions } from "./attributes";
export type EditCommand = {
  kind: "draft" | "listing";
  id?: string;
  revision: number;
  mode: "save" | "publish";
  payload: ListingPayload;
  photoOrder: string[];
  uploads: File[];
};
export class ListingService {
  constructor(
    private db: Pool,
    private store: {
      save: (f: File) => Promise<string>;
      remove: (key: string) => Promise<void>;
    } = { save: saveImage, remove: deleteImage },
  ) {}
  async save(owner: string, cmd: EditCommand) {
    const publish = cmd.mode === "publish" || cmd.kind === "listing";
    const payload = validatePayload(cmd.payload, publish);
    if (
      cmd.uploads.length > 10 ||
      !Number.isInteger(cmd.revision) ||
      cmd.revision < 0
    )
      throw new ListingError("invalid");
    const client = await this.db.connect();
    const newKeys: string[] = [];
    let result: { id: string; kind: "draft" | "listing" };
    try {
      await client.query("BEGIN");
      // Use the same lock order as account deletion, so deleting an account cannot race new uploads.
      const {
        rows: [user],
      } = await client.query(
        "SELECT id,phone_verified,email_verified FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL FOR UPDATE",
        [owner],
      );
      if (!user) throw new ListingError("notFound");
      if (publish && !user.phone_verified && !user.email_verified)
        throw new ListingError("phoneRequired");
      let id = cmd.id;
      let row;
      if (id) {
        const r = await client.query(
          cmd.kind === "draft"
            ? "SELECT * FROM listing_drafts WHERE id=$1 AND seller_id=$2 FOR UPDATE"
            : "SELECT * FROM listings WHERE id=$1 AND seller_id=$2 AND status IN ('ACTIVE','RESERVED','DRAFT','EXPIRED','PENDING_REVIEW','REJECTED') FOR UPDATE",
          [id, owner],
        );
        row = r.rows[0];
        if (!row) throw new ListingError("notFound");
        if (row.revision !== cmd.revision) throw new ListingError("conflict");
      } else {
        if (cmd.kind !== "draft" || cmd.revision !== 0)
          throw new ListingError("invalid");
        id = randomUUID();
        await client.query(
          "INSERT INTO listing_drafts(id,seller_id) VALUES($1,$2)",
          [id, owner],
        );
      }
      const field = cmd.kind === "draft" ? "draft_id" : "listing_id";
      const { rows: existing } = await client.query(
        `SELECT id,storage_key FROM listing_images WHERE ${field}=$1 ORDER BY position FOR UPDATE`,
        [id],
      );
      const order = validatePhotoOrder(
        cmd.photoOrder,
        existing.map((i) => i.id),
        cmd.uploads.length,
        publish,
      );
      if (payload.category) {
        const valid = await client.query(
          "SELECT 1 FROM categories WHERE id=$1 AND category_visible(id)",
          [payload.category],
        );
        if (!valid.rowCount) throw new ListingError("invalid");
      } else if (publish) throw new ListingError("invalid");
      if (payload.location) {
        const valid = await client.query(
          "SELECT 1 FROM locations WHERE id=$1 AND kind IN ('CITY','TOWNSHIP')",
          [payload.location],
        );
        if (!valid.rowCount) throw new ListingError("invalid");
      } else if (publish) throw new ListingError("invalid");
      const definitions = await attributeDefinitions(client, payload.category);
      const attributes = validateAttributes(
        payload.attributes,
        definitions,
        publish,
      );
      // New objects are registered for cleanup if the SQL transaction or a later upload fails.
      for (const file of cmd.uploads) {
        try {
          newKeys.push(await this.store.save(file));
        } catch {
          throw new ListingError("uploadFailed");
        }
      }
      const removed = existing.filter((i) => !order.includes(i.id));
      for (const image of removed) {
        await client.query(
          "INSERT INTO image_deletions(storage_key) VALUES($1) ON CONFLICT DO NOTHING",
          [image.storage_key],
        );
        await client.query("DELETE FROM listing_images WHERE id=$1", [
          image.id,
        ]);
      }
      const images = new Map(existing.map((i) => [i.id, i.storage_key]));
      for (const [index, key] of newKeys.entries())
        images.set("new:" + index, key);
      let targetId = id!,
        targetKind = cmd.kind;
      if (cmd.kind === "draft" && cmd.mode === "publish") {
        const {
          rows: [listing],
        } = await client.query(
          "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
          [
            owner,
            payload.category,
            payload.location,
            payload.title,
            payload.description,
            payload.type,
            payload.price,
            payload.condition,
          ],
        );
        targetId = listing.id;
        targetKind = "listing";
        await client.query(
          "UPDATE listing_images SET listing_id=$1,draft_id=NULL WHERE draft_id=$2",
          [targetId, id],
        );
      } else if (cmd.kind === "listing")
        await client.query(
          "UPDATE listings SET title=$1,description=$2,category_id=$3,location_id=$4,listing_type=$5,price=$6,condition=$7,updated_at=now(),revision=revision+1,status=CASE WHEN $9='publish' THEN 'ACTIVE' ELSE status END,expires_at=CASE WHEN $9='publish' THEN now()+interval '60 days' ELSE expires_at END WHERE id=$8",
          [
            payload.title,
            payload.description,
            payload.category,
            payload.location,
            payload.type,
            payload.price,
            payload.condition,
            id,
            cmd.mode,
          ],
        );
      else
        await client.query(
          "UPDATE listing_drafts SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE id=$2",
          [JSON.stringify(payload), id],
        );
      for (const [position, token] of order.entries()) {
        if (token.startsWith("new:"))
          await client.query(
            `INSERT INTO listing_images(${targetKind === "draft" ? "draft_id" : "listing_id"},storage_key,position,processing_state) VALUES($1,$2,$3,'PENDING') RETURNING id`,
            [targetId, images.get(token), position],
          );
        else
          await client.query(
            "UPDATE listing_images SET position=$1 WHERE id=$2",
            [position, token],
          );
      }
      await client.query(
        `INSERT INTO image_jobs(image_id) SELECT id FROM listing_images WHERE ${targetKind === "draft" ? "draft_id" : "listing_id"}=$1 AND processing_state='PENDING' ON CONFLICT DO NOTHING`,
        [targetId],
      );
      if (targetKind === "listing") {
        await client.query(
          "DELETE FROM listing_attribute_values WHERE listing_id=$1",
          [targetId],
        );
        for (const [attribute, value] of Object.entries(attributes))
          await client.query(
            "INSERT INTO listing_attribute_values(listing_id,attribute_id,value) VALUES($1,$2,$3::jsonb)",
            [targetId, attribute, JSON.stringify(value)],
          );
      }
      if (targetKind === "listing") {
        await client.query(
          "UPDATE listings SET search_title=$1,search_text=$2 WHERE id=$3",
          [
            normalizeIndex(payload.title),
            normalizeIndex(payload.title + " " + payload.description),
            targetId,
          ],
        );
        const reasons = await reviewReasons(
          client,
          owner,
          targetId,
          payload.title,
          payload.description,
        );
        if (
          row &&
          (row.status === "REJECTED" ||
            (row.status === "PENDING_REVIEW" &&
              row.automation_state !== "PENDING"))
        )
          reasons.push("policy:resubmission");
        await client.query(
          "UPDATE listings SET status='PENDING_REVIEW',automation_state='PENDING',moderation_reasons=$2::jsonb WHERE id=$1",
          [targetId, JSON.stringify(reasons)],
        );
        await client.query(
          "INSERT INTO moderation_jobs(listing_id,revision) SELECT id,revision FROM listings WHERE id=$1 ON CONFLICT(listing_id) DO UPDATE SET revision=excluded.revision,attempts=0,next_attempt=now(),lease_id=NULL,lease_until=NULL,last_error=NULL",
          [targetId],
        );
      }
      if (cmd.kind === "draft" && cmd.mode === "publish")
        await client.query("DELETE FROM listing_drafts WHERE id=$1", [id]);
      result = { id: targetId, kind: targetKind };
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      for (const key of newKeys) {
        try {
          await this.store.remove(key);
        } catch {
          await client.query(
            "INSERT INTO image_deletions(storage_key) VALUES($1) ON CONFLICT DO NOTHING",
            [key],
          );
        }
      }
      throw e;
    } finally {
      client.release();
    }
    return result;
  }
  async activate(owner: string, id: string) {
    const {
      rows: [l],
    } = await this.db.query(
      "SELECT * FROM listings WHERE id=$1 AND seller_id=$2",
      [id, owner],
    );
    if (!l || !["DRAFT", "EXPIRED", "RESERVED"].includes(l.status))
      throw new ListingError("notFound");
    const { rows: images } = await this.db.query(
      "SELECT id FROM listing_images WHERE listing_id=$1 ORDER BY position",
      [id],
    );
    const { rows: attrs } = await this.db.query(
      "SELECT attribute_id,value FROM listing_attribute_values WHERE listing_id=$1",
      [id],
    );
    return this.save(owner, {
      kind: "listing",
      id,
      revision: l.revision,
      mode: "publish",
      payload: {
        title: l.title,
        description: l.description,
        category: l.category_id,
        location: l.location_id,
        type: l.listing_type,
        price: String(l.price),
        condition: l.condition,
        attributes: Object.fromEntries(
          attrs.map((r) => [r.attribute_id, String(r.value)]),
        ),
      },
      photoOrder: images.map((r) => r.id),
      uploads: [],
    });
  }
  async discard(owner: string, id: string, revision: number) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        owner,
      ]);
      const {
        rows: [draft],
      } = await client.query(
        "SELECT revision FROM listing_drafts WHERE id=$1 AND seller_id=$2 FOR UPDATE",
        [id, owner],
      );
      if (!draft) throw new ListingError("notFound");
      if (draft.revision !== revision) throw new ListingError("conflict");
      await client.query(
        "INSERT INTO image_deletions(storage_key) SELECT storage_key FROM listing_images WHERE draft_id=$1 ON CONFLICT DO NOTHING",
        [id],
      );
      await client.query("DELETE FROM listing_drafts WHERE id=$1", [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
export const listingService = new ListingService(pool);
