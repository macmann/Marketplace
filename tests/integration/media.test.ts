import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isolatedDatabase } from "../helpers/database";
import { ListingService } from "../../lib/listing-service";
import { emptyPayload } from "../../lib/listing-validation";
import { MediaWorker, sweepOrphanedMedia } from "../../lib/media-worker";
import { imageKeys } from "../../lib/storage";
import { ModerationService } from "../../lib/moderation";
let fixture: Awaited<ReturnType<typeof isolatedDatabase>>,
  owner: string,
  admin: string;
const objects = new Map<string, Buffer>();
let image: Buffer;
const store = {
  read: async (k: string) => {
    const b = objects.get(k);
    if (!b) throw Error("missing");
    return b;
  },
  put: async (k: string, b: Buffer) => {
    objects.set(k, b);
  },
  remove: async (k: string) => {
    objects.delete(k);
  },
};
const create = async (title: string, extra = {}) => {
  const service = new ListingService(fixture.db, {
    save: async () => {
      const key = randomUUID() + ".webp";
      objects.set(imageKeys(key).source, image);
      objects.set(imageKeys(key).preview, image);
      return key;
    },
    remove: async (k) => {
      for (const key of Object.values(imageKeys(k))) objects.delete(key);
    },
  });
  return service.save(owner, {
    kind: "draft",
    revision: 0,
    mode: "publish",
    payload: {
      ...emptyPayload,
      title,
      description: "A solid chair that can be inspected before payment.",
      category: "home",
      location: "sanchaung",
      price: "12000",
      attributes: {},
    },
    photoOrder: ["new:0"],
    uploads: [new File(["fixture"], "fixture.jpg", { type: "image/jpeg" })],
    ...extra,
  });
};
const listing = async (id: string) =>
  (await fixture.db.query("SELECT * FROM listings WHERE id=$1", [id])).rows[0];
before(async () => {
  fixture = await isolatedDatabase();
  await fixture.db.query(
    "INSERT INTO categories(id,name_en,name_my) VALUES('home','Home','အိမ်')",
  );
  await fixture.db.query(
    "INSERT INTO locations(id,name_en,name_my,kind) VALUES('sanchaung','Sanchaung','စမ်းချောင်း','TOWNSHIP')",
  );
  owner = (
    await fixture.db.query(
      "INSERT INTO users(name,phone_verified) VALUES('Media fixture',true) RETURNING id",
    )
  ).rows[0].id;
  admin = (
    await fixture.db.query(
      "INSERT INTO users(name,role) VALUES('Moderator','ADMIN') RETURNING id",
    )
  ).rows[0].id;
  image = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#918273" },
  })
    .jpeg()
    .toBuffer();
});
after(async () => {
  await fixture.close();
});
test("queued photos stay private, generate real variants, remove sources and allow clean local publication", async () => {
  await fixture.db.query(
    "UPDATE marketplace_settings SET moderation_mode='LOCAL'",
  );
  const l = await create("Queued chair " + randomUUID());
  assert.equal((await listing(l.id)).status, "PENDING_REVIEW");
  const worker = new MediaWorker(fixture.db, store);
  // Legacy public images retain READY during backfill, but a newly submitted
  // review must still wait for the hash/variant job before deciding.
  await fixture.db.query(
    "UPDATE listing_images SET processing_state='READY' WHERE listing_id=$1",
    [l.id],
  );
  await worker.moderation(20);
  assert.equal((await listing(l.id)).automation_state, "PENDING");
  await fixture.db.query(
    "UPDATE moderation_jobs SET next_attempt=now() WHERE listing_id=$1",
    [l.id],
  );
  await worker.images(20);
  await worker.moderation(20);
  const ready = await listing(l.id);
  assert.equal(ready.status, "ACTIVE");
  assert.equal(ready.automation_state, "PASSED");
  const photo = (
    await fixture.db.query("SELECT * FROM listing_images WHERE listing_id=$1", [
      l.id,
    ])
  ).rows[0];
  assert.equal(photo.processing_state, "READY");
  assert.equal(photo.variants_ready, true);
  assert.ok(photo.sha256);
  const keys = imageKeys(photo.storage_key);
  assert.ok(
    objects.has(keys.card) &&
      objects.has(keys.thumb) &&
      objects.has(keys.original),
  );
  assert.equal(objects.has(keys.source), false);
  const audit = await fixture.db.query(
    "SELECT * FROM automated_reviews WHERE listing_id=$1 AND outcome='ALLOW'",
    [l.id],
  );
  assert.equal(audit.rowCount, 1);
});
test("identical photos and manual policy require human review; unfinished images cannot be approved", async () => {
  const l = await create("Repeated photo " + randomUUID());
  const moderation = new ModerationService(fixture.db);
  await assert.rejects(
    moderation.act(admin, l.id, "APPROVE", "Inspected"),
    /automation_pending/,
  );
  const worker = new MediaWorker(fixture.db, store);
  await worker.images(20);
  await worker.moderation(20);
  assert.equal((await listing(l.id)).automation_state, "REVIEW");
  assert.ok(
    (await listing(l.id)).moderation_reasons.includes(
      "image:possible_duplicate",
    ),
  );
  await moderation.act(
    admin,
    l.id,
    "APPROVE",
    "Photo reuse permitted after inspection",
  );
  assert.equal((await listing(l.id)).status, "ACTIVE");
  await fixture.db.query(
    "UPDATE marketplace_settings SET moderation_mode='MANUAL'",
  );
  const manual = await create("Manual policy " + randomUUID());
  await worker.images(20);
  await worker.moderation(20);
  assert.ok(
    (await listing(manual.id)).moderation_reasons.includes(
      "provider:manual_review",
    ),
  );
});
test("provider failures retry and remain private, then fall back to human review; late results never revive removed content", async () => {
  await fixture.db.query(
    "UPDATE marketplace_settings SET moderation_mode='OPENAI'",
  );
  const l = await create("Provider retry " + randomUUID());
  const worker = new MediaWorker(fixture.db, store, {
    review: async () => {
      throw Error("outage");
    },
  });
  await worker.images(20);
  for (let n = 0; n < 3; n++) {
    await fixture.db.query(
      "UPDATE moderation_jobs SET next_attempt=now() WHERE listing_id=$1",
      [l.id],
    );
    await worker.moderation(1);
  }
  assert.equal((await listing(l.id)).status, "PENDING_REVIEW");
  assert.equal((await listing(l.id)).automation_state, "REVIEW");
  assert.ok(
    (await listing(l.id)).moderation_reasons.includes("provider:unavailable"),
  );
  const late = await create("Late result " + randomUUID());
  await worker.images(20);
  const race = new MediaWorker(fixture.db, store, {
    review: async () => {
      await new ModerationService(fixture.db).act(
        admin,
        late.id,
        "REMOVE",
        "Removed while checking",
      );
      return [];
    },
  });
  await race.moderation(20);
  assert.equal((await listing(late.id)).status, "REMOVED");
});
test("rules and required fields changed during an external check still prevent publication", async () => {
  await fixture.db.query(
    "UPDATE marketplace_settings SET moderation_mode='OPENAI'",
  );
  const pending = await create("Policy race " + randomUUID());
  const worker = new MediaWorker(fixture.db, store, {
    review: async () => {
      await fixture.db.query(
        "INSERT INTO moderation_rules(phrase) VALUES('Policy race')",
      );
      await fixture.db.query(
        "INSERT INTO category_attributes(category_id,key,name_en,name_my,type,required) VALUES('home','new_required','New required','လိုအပ်','TEXT',true)",
      );
      return [];
    },
  });
  await worker.images(20);
  await worker.moderation(20);
  const result = await listing(pending.id);
  assert.equal(result.status, "PENDING_REVIEW");
  assert.ok(result.moderation_reasons.includes("Text rule: Policy race"));
  assert.ok(result.moderation_reasons.includes("policy:listing_changed"));
  await fixture.db.query(
    "DELETE FROM moderation_rules WHERE phrase='Policy race'",
  );
  await fixture.db.query(
    "DELETE FROM category_attributes WHERE key='new_required'",
  );
});
test("processing failures have bounded retries and a stale lease never queues deletion of a live image", async () => {
  const broken = await create("Broken image " + randomUUID());
  const photo = (
    await fixture.db.query("SELECT * FROM listing_images WHERE listing_id=$1", [
      broken.id,
    ])
  ).rows[0];
  objects.set(imageKeys(photo.storage_key).source, Buffer.from("broken"));
  const worker = new MediaWorker(fixture.db, store);
  for (let n = 0; n < 5; n++) {
    await fixture.db.query(
      "UPDATE image_jobs SET next_attempt=now() WHERE image_id=$1",
      [photo.id],
    );
    await worker.images(20);
  }
  assert.equal(
    (
      await fixture.db.query(
        "SELECT processing_state FROM listing_images WHERE id=$1",
        [photo.id],
      )
    ).rows[0].processing_state,
    "FAILED",
  );
  assert.equal(
    (
      await fixture.db.query(
        "SELECT attempts FROM image_jobs WHERE image_id=$1",
        [photo.id],
      )
    ).rows[0].attempts,
    5,
  );
  const live = await create("Lease fixture " + randomUUID());
  const img = (
    await fixture.db.query("SELECT * FROM listing_images WHERE listing_id=$1", [
      live.id,
    ])
  ).rows[0];
  let changed = false;
  const race = new MediaWorker(fixture.db, {
    ...store,
    put: async (k, b) => {
      await store.put(k, b);
      if (!changed) {
        changed = true;
        await fixture.db.query(
          "UPDATE image_jobs SET lease_id=$1,lease_until=now()+interval '1 minute' WHERE image_id=$2",
          [randomUUID(), img.id],
        );
      }
    },
  });
  await race.images(1);
  assert.equal(
    (
      await fixture.db.query(
        "SELECT * FROM image_deletions WHERE storage_key=$1",
        [img.storage_key],
      )
    ).rowCount,
    0,
  );
});
test("orphan sweeping preserves linked and fresh objects, removes old unlinked families and advances its cursor", async () => {
  const linked = (
    await fixture.db.query("SELECT storage_key FROM listing_images LIMIT 1")
  ).rows[0].storage_key;
  const orphan = randomUUID() + ".source",
    fresh = randomUUID() + ".source";
  const old = new Date(Date.now() - 25 * 3600000);
  const removed: string[] = [];
  await sweepOrphanedMedia(fixture.db, {
    list: async () => ({
      objects: [
        { key: linked, modified: old },
        { key: orphan, modified: old },
        { key: fresh, modified: new Date() },
      ],
      cursor: "next-page",
    }),
    remove: async (k) => {
      removed.push(k);
    },
  });
  assert.deepEqual(removed, [orphan]);
  assert.equal(
    (await fixture.db.query("SELECT cursor FROM storage_scan_state")).rows[0]
      .cursor,
    "next-page",
  );
});
