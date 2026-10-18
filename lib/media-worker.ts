import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { reviewReasons } from "./moderation";
import { attributeDefinitions } from "./attributes";
import { validatePayload, validateAttributes } from "./listing-validation";
import {
  imageKeys,
  readObject,
  putObject,
  removeObject,
  deleteImage,
  listStoredObjects,
} from "./storage";
import { imageVariants } from "./image-analysis";
import {
  OpenAiModerator,
  textRiskReasons,
  similarImages,
  type ContentModerator,
} from "./automated-moderation";
type Store = {
  read: (key: string) => Promise<Buffer>;
  put: (key: string, buffer: Buffer) => Promise<void>;
  remove: (key: string) => Promise<void>;
};
export class MediaWorker {
  constructor(
    private db: Pool = pool,
    private store: Store = {
      read: readObject,
      put: putObject,
      remove: removeObject,
    },
    private moderator: ContentModerator = new OpenAiModerator(),
  ) {}
  async images(limit = 2) {
    for (let n = 0; n < limit; n++) {
      const lease = randomUUID();
      const {
        rows: [job],
      } = await this.db.query(
        `UPDATE image_jobs SET lease_id=$1,lease_until=now()+interval '90 seconds',attempts=attempts+1 WHERE image_id=(SELECT image_id FROM image_jobs WHERE next_attempt<=now() AND attempts<5 AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
        [lease],
      );
      if (!job) break;
      const {
        rows: [image],
      } = await this.db.query(
        "SELECT i.*,COALESCE(l.seller_id,d.seller_id) owner FROM listing_images i LEFT JOIN listings l ON l.id=i.listing_id LEFT JOIN listing_drafts d ON d.id=i.draft_id WHERE i.id=$1",
        [job.image_id],
      );
      if (!image) continue;
      const keys = imageKeys(image.storage_key);
      try {
        const input = await this.store
          .read(keys.source)
          .catch(() => this.store.read(keys.original));
        const result = await imageVariants(input);
        for (const [key, buffer] of [
          [keys.original, result.original],
          [keys.thumb, result.thumb],
          [keys.card, result.card],
        ] as const)
          await this.store.put(key, buffer);
        const c = await this.db.connect();
        let retained = false;
        try {
          await c.query("BEGIN");
          await c.query("SELECT pg_advisory_xact_lock(742903)");
          await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
            image.owner,
          ]);
          const updated = await c.query(
            `UPDATE listing_images i SET processing_state='READY',variants_ready=true,sha256=$1,perceptual_hash=$2,width=$3,height=$4 FROM image_jobs j WHERE i.id=$5 AND j.image_id=i.id AND j.lease_id=$6 RETURNING i.id`,
            [
              result.sha256,
              result.perceptualHash,
              result.width,
              result.height,
              image.id,
              lease,
            ],
          );
          retained = Boolean(updated.rowCount);
          if (retained)
            await c.query(
              "DELETE FROM image_jobs WHERE image_id=$1 AND lease_id=$2",
              [image.id, lease],
            );
          await c.query("COMMIT");
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
        if (retained) {
          await this.store.remove(keys.source).catch(() => {});
          await this.store.remove(keys.preview).catch(() => {});
        } else if (
          !(
            await this.db.query(
              "SELECT 1 FROM listing_images WHERE id=$1 AND storage_key=$2",
              [image.id, image.storage_key],
            )
          ).rowCount
        )
          await this.db.query(
            "INSERT INTO image_deletions(storage_key) VALUES($1) ON CONFLICT DO NOTHING",
            [image.storage_key],
          );
      } catch {
        const c = await this.db.connect();
        try {
          await c.query("BEGIN");
          const updated = await c.query(
            "UPDATE image_jobs SET lease_id=NULL,lease_until=NULL,next_attempt=now()+power(2,attempts)*interval '15 seconds',last_error='image_processing_failed' WHERE image_id=$1 AND lease_id=$2 RETURNING attempts",
            [image.id, lease],
          );
          if (updated.rows[0]?.attempts >= 5)
            await c.query(
              "UPDATE listing_images SET processing_state='FAILED' WHERE id=$1 AND processing_state='PENDING'",
              [image.id],
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
  }
  async moderation(limit = 2) {
    for (let n = 0; n < limit; n++) {
      const lease = randomUUID();
      const {
        rows: [job],
      } = await this.db.query(
        `UPDATE moderation_jobs SET lease_id=$1,lease_until=now()+interval '90 seconds' WHERE listing_id=(SELECT listing_id FROM moderation_jobs WHERE next_attempt<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
        [lease],
      );
      if (!job) break;
      const {
        rows: [l],
      } = await this.db.query(
        "SELECT l.*,u.suspended,u.deleted_at FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1",
        [job.listing_id],
      );
      if (
        !l ||
        l.revision !== job.revision ||
        l.status !== "PENDING_REVIEW" ||
        l.automation_state !== "PENDING"
      ) {
        await this.db.query(
          "DELETE FROM moderation_jobs WHERE listing_id=$1 AND lease_id=$2",
          [job.listing_id, lease],
        );
        continue;
      }
      const { rows: images } = await this.db.query(
        "SELECT i.*,j.attempts processing_attempts FROM listing_images i LEFT JOIN image_jobs j ON j.image_id=i.id WHERE i.listing_id=$1 ORDER BY i.position",
        [l.id],
      );
      if (
        images.some(
          (i) =>
            i.processing_state === "PENDING" ||
            (i.processing_attempts != null && i.processing_attempts < 5),
        )
      ) {
        await this.db.query(
          "UPDATE moderation_jobs SET lease_id=NULL,lease_until=NULL,next_attempt=now()+interval '3 seconds' WHERE listing_id=$1 AND lease_id=$2",
          [l.id, lease],
        );
        continue;
      }
      let reasons: string[] = [
        ...l.moderation_reasons,
        ...textRiskReasons(l.title, l.description),
      ];
      const {
        rows: [settings],
      } = await this.db.query(
        "SELECT * FROM marketplace_settings WHERE id=true",
      );
      if (
        !images.length ||
        images.some(
          (i) => i.processing_state === "FAILED" || i.processing_attempts >= 5,
        )
      )
        reasons.push("image:processing_failed");
      const velocity = await this.db.query(
        "SELECT count(*) FROM listings WHERE seller_id=$1 AND id<>$2 AND created_at>now()-interval '10 minutes'",
        [l.seller_id, l.id],
      );
      if (Number(velocity.rows[0].count) >= 4)
        reasons.push("risk:posting_velocity");
      const { rows: others } = await this.db.query(
        "SELECT i.sha256,i.perceptual_hash FROM listing_images i JOIN listings l ON l.id=i.listing_id WHERE l.id<>$1 AND l.status IN ('ACTIVE','RESERVED','PENDING_REVIEW') AND (i.sha256=ANY($2::text[]) OR ($3 AND i.perceptual_hash IS NOT NULL AND l.seller_id=$4)) ORDER BY l.created_at DESC LIMIT 300",
        [
          l.id,
          images.map((i) => i.sha256).filter(Boolean),
          images.some((i) => i.perceptual_hash),
          l.seller_id,
        ],
      );
      if (images.some((i) => others.some((o) => similarImages(i, o))))
        reasons.push("image:possible_duplicate");
      if (settings.review_all) reasons.push("policy:manual_review");
      if (settings.moderation_mode === "MANUAL")
        reasons.push("provider:manual_review");
      if (
        settings.moderation_mode === "OPENAI" &&
        !reasons.includes("image:processing_failed")
      ) {
        try {
          reasons.push(
            ...(await this.moderator.review({
              text: l.title + "\n" + l.description,
              images: await Promise.all(
                images.map((i) => this.store.read(i.storage_key)),
              ),
            })),
          );
        } catch {
          const attempts = job.attempts + 1;
          if (attempts < 3) {
            await this.db.query(
              "UPDATE moderation_jobs SET attempts=$1::integer,lease_id=NULL,lease_until=NULL,next_attempt=now()+power(2,$1::integer)*interval '15 seconds',last_error='provider_unavailable' WHERE listing_id=$2 AND lease_id=$3",
              [attempts, l.id, lease],
            );
            continue;
          }
          reasons.push("provider:unavailable");
        }
      }
      const c = await this.db.connect();
      try {
        await c.query("BEGIN");
        await c.query("SELECT pg_advisory_xact_lock(742903)");
        await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          l.seller_id,
        ]);
        const locked = await c.query(
          "SELECT * FROM listings WHERE id=$1 FOR UPDATE",
          [l.id],
        );
        const current = locked.rows[0];
        const guard = await c.query(
          "SELECT 1 FROM moderation_jobs WHERE listing_id=$1 AND lease_id=$2",
          [l.id, lease],
        );
        if (
          !guard.rowCount ||
          !current ||
          current.revision !== job.revision ||
          current.status !== "PENDING_REVIEW" ||
          current.automation_state !== "PENDING"
        ) {
          await c.query("COMMIT");
          continue;
        }
        const {
          rows: [user],
        } = await c.query(
          "SELECT suspended,deleted_at,phone_verified FROM users WHERE id=$1",
          [l.seller_id],
        );
        const {
          rows: [category],
        } = await c.query("SELECT category_visible($1) visible", [
          current.category_id,
        ]);
        const {
          rows: [policy],
        } = await c.query("SELECT * FROM marketplace_settings WHERE id=true");
        if (
          user.suspended ||
          user.deleted_at ||
          !user.phone_verified ||
          !category.visible ||
          new Date(current.expires_at) <= new Date()
        )
          reasons.push("policy:listing_unavailable");
        if (
          policy.review_all !== settings.review_all ||
          policy.moderation_mode !== settings.moderation_mode
        )
          reasons.push("policy:changed");
        reasons.push(
          ...(await reviewReasons(
            c,
            l.seller_id,
            l.id,
            current.title,
            current.description,
          )),
        );
        try {
          validatePayload(
            {
              title: current.title,
              description: current.description,
              category: current.category_id,
              location: current.location_id,
              type: current.listing_type,
              price: String(current.price),
              condition: current.condition,
              attributes: {},
            },
            true,
          );
          const attrs = await c.query(
            "SELECT attribute_id,value FROM listing_attribute_values WHERE listing_id=$1",
            [l.id],
          );
          validateAttributes(
            Object.fromEntries(
              attrs.rows.map((r) => [r.attribute_id, String(r.value)]),
            ),
            await attributeDefinitions(c, current.category_id),
            true,
          );
        } catch {
          reasons.push("policy:listing_changed");
        }
        reasons = [...new Set(reasons)];
        const allow = !reasons.length;
        await c.query(
          "INSERT INTO automated_reviews(listing_id,revision,outcome,reasons,provider) VALUES($1,$2,$3,$4::jsonb,$5)",
          [
            l.id,
            job.revision,
            allow ? "ALLOW" : "REVIEW",
            JSON.stringify(reasons),
            settings.moderation_mode,
          ],
        );
        await c.query(
          "UPDATE listings SET status=$1,automation_state=$2,moderation_reasons=$3::jsonb,updated_at=now() WHERE id=$4",
          [
            allow ? "ACTIVE" : "PENDING_REVIEW",
            allow ? "PASSED" : "REVIEW",
            JSON.stringify(reasons),
            l.id,
          ],
        );
        await c.query(
          "INSERT INTO audit_logs(action,entity_id,detail) VALUES('AUTOMATED_REVIEW',$1,$2)",
          [l.id, allow ? "ALLOW" : "REVIEW"],
        );
        await c.query(
          "DELETE FROM moderation_jobs WHERE listing_id=$1 AND lease_id=$2",
          [l.id, lease],
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
}
export async function sweepOrphanedMedia(
  db: Pool = pool,
  store = { list: listStoredObjects, remove: removeObject },
) {
  const {
    rows: [state],
  } = await db.query("SELECT cursor FROM storage_scan_state WHERE id=true");
  const batch = await store.list(state.cursor);
  for (const object of batch.objects) {
    if (Date.now() - object.modified.getTime() < 24 * 3600000) continue;
    const base = object.key.replace(
      /(?:\.(?:preview|thumb|card))?\.(?:webp|source)$/,
      ".webp",
    );
    const linked = await db.query(
      "SELECT 1 FROM listing_images WHERE storage_key=$1",
      [base],
    );
    if (!linked.rowCount) await store.remove(object.key);
  }
  await db.query("UPDATE storage_scan_state SET cursor=$1 WHERE id=true", [
    batch.cursor,
  ]);
}
export const mediaWorker = new MediaWorker();
