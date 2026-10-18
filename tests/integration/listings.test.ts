import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import {
  ListingService,
  attributeDefinitions,
  type EditCommand,
} from "../../lib/listing-service";
import {
  ListingError,
  emptyPayload,
  type ListingPayload,
} from "../../lib/listing-validation";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const owners: string[] = [];
const keys: string[] = [];
let owner: string,
  other: string,
  unverified: string,
  category: string,
  requiredId: string;
const store = {
  save: async (_file: File) => {
    const key = randomUUID() + ".webp";
    keys.push(key);
    return key;
  },
  remove: async (_key: string) => {},
};
const service = new ListingService(db, store);
const file = () =>
  new File(["test fixture"], "test.jpg", { type: "image/jpeg" });
const command = (
  payload: ListingPayload,
  extra: Partial<EditCommand> = {},
): EditCommand => ({
  kind: "draft",
  revision: 0,
  mode: "save",
  payload,
  photoOrder: [],
  uploads: [],
  ...extra,
});
async function current(id: string, kind = "draft") {
  return (
    await db.query(
      kind === "draft"
        ? "SELECT * FROM listing_drafts WHERE id=$1"
        : "SELECT * FROM listings WHERE id=$1",
      [id],
    )
  ).rows[0];
}
async function images(id: string, kind = "draft") {
  return (
    await db.query(
      `SELECT * FROM listing_images WHERE ${kind === "draft" ? "draft_id" : "listing_id"}=$1 ORDER BY position`,
      [id],
    )
  ).rows;
}
const valid = (): ListingPayload => ({
  ...emptyPayload,
  title: "Integration chair " + randomUUID(),
  description: "A solid wooden chair in good condition.",
  category,
  location: "sanchaung",
  price: "12000",
  attributes: { [requiredId]: "Wood" },
});
before(async () => {
  for (const verified of [true, true, false]) {
    const {
      rows: [u],
    } = await db.query(
      "INSERT INTO users(name,phone_verified) VALUES('Listing fixture',$1) RETURNING id",
      [verified],
    );
    owners.push(u.id);
  }
  [owner, other, unverified] = owners;
  category = "listing-test-" + randomUUID();
  await db.query(
    "INSERT INTO categories(id,name_en,name_my,parent_id) VALUES($1,'Listing integration category','စမ်းသပ်မှု','home')",
    [category],
  );
  requiredId = (
    await db.query(
      "INSERT INTO category_attributes(category_id,key,name_en,name_my,type,choices,required) VALUES($1,'material_test','Material test','စမ်းသပ်ပစ္စည်း','ENUM','[\"Wood\",\"Metal\"]',true) RETURNING id",
      [category],
    )
  ).rows[0].id;
});
after(async () => {
  for (const id of owners) {
    await db.query("DELETE FROM listing_drafts WHERE seller_id=$1", [id]);
    await db.query("DELETE FROM listings WHERE seller_id=$1", [id]);
    await db.query("DELETE FROM users WHERE id=$1", [id]);
  }
  await db.query(
    "DELETE FROM image_deletions WHERE storage_key=ANY($1::text[])",
    [keys],
  );
  await db.query("DELETE FROM category_attributes WHERE category_id=$1", [
    category,
  ]);
  await db.query("DELETE FROM categories WHERE id=$1", [category]);
  await db.end();
});
test("unverified users can save private partial drafts but cannot publish", async () => {
  const d = await service.save(
    unverified,
    command({ ...emptyPayload, title: "W" }),
  );
  assert.equal(d.kind, "draft");
  assert.equal((await current(d.id)).payload.title, "W");
  assert.equal(
    (await db.query("SELECT id FROM listings WHERE id=$1", [d.id])).rowCount,
    0,
  );
  await assert.rejects(
    service.save(
      unverified,
      command(valid(), {
        id: d.id,
        revision: (await current(d.id)).revision,
        mode: "publish",
        uploads: [file()],
        photoOrder: ["new:0"],
      }),
    ),
    (e: unknown) => e instanceof ListingError && e.code === "phoneRequired",
  );
});
test("draft publication validates inherited attributes and transfers ordered photos atomically", async () => {
  const defs = await attributeDefinitions(db, category);
  assert.ok(defs.some((d) => d.key === "dimensions"));
  assert.ok(defs.some((d) => d.id === requiredId));
  const draft = await service.save(
    owner,
    command(valid(), {
      uploads: [file(), file()],
      photoOrder: ["new:0", "new:1"],
    }),
  );
  const before = await images(draft.id);
  const published = await service.save(
    owner,
    command(valid(), {
      id: draft.id,
      revision: (await current(draft.id)).revision,
      mode: "publish",
      photoOrder: [before[1].id, before[0].id],
    }),
  );
  assert.equal(published.kind, "listing");
  assert.equal(await current(draft.id), undefined);
  const after = await images(published.id, "listing");
  assert.deepEqual(
    after.map((i) => i.storage_key),
    [before[1].storage_key, before[0].storage_key],
  );
  assert.ok(after.every((i) => i.draft_id === null));
  assert.equal(
    (
      await db.query(
        "SELECT value FROM listing_attribute_values WHERE listing_id=$1 AND attribute_id=$2",
        [published.id, requiredId],
      )
    ).rows[0].value,
    "Wood",
  );
});
test("photo replacement removes only selected objects and queues physical cleanup", async () => {
  const p = await service.save(
    owner,
    command(valid(), {
      mode: "publish",
      uploads: [file(), file()],
      photoOrder: ["new:0", "new:1"],
    }),
  );
  const old = await images(p.id, "listing");
  await service.save(
    owner,
    command(valid(), {
      kind: "listing",
      id: p.id,
      revision: (await current(p.id, "listing")).revision,
      uploads: [file()],
      photoOrder: ["new:0", old[0].id],
    }),
  );
  const next = await images(p.id, "listing");
  assert.equal(next.length, 2);
  assert.equal(next[1].id, old[0].id);
  assert.equal(
    next.some((i) => i.id === old[1].id),
    false,
  );
  assert.equal(
    (
      await db.query(
        "SELECT storage_key FROM image_deletions WHERE storage_key=$1",
        [old[1].storage_key],
      )
    ).rowCount,
    1,
  );
});
test("stale revisions, foreign drafts and foreign photo IDs are rejected without overwriting", async () => {
  const a = await service.save(
    owner,
    command(valid(), { uploads: [file()], photoOrder: ["new:0"] }),
  );
  const b = await service.save(
    other,
    command(valid(), { uploads: [file()], photoOrder: ["new:0"] }),
  );
  const row = await current(a.id);
  const own = await images(a.id);
  const foreign = await images(b.id);
  await assert.rejects(
    service.save(other, command(valid(), { id: a.id, revision: row.revision })),
    ListingError,
  );
  await assert.rejects(
    service.save(
      owner,
      command(valid(), {
        id: a.id,
        revision: row.revision,
        photoOrder: [foreign[0].id],
      }),
    ),
    (e: unknown) => e instanceof ListingError && e.code === "photoOwnership",
  );
  await service.save(
    owner,
    command(
      { ...valid(), title: "First tab saved" },
      { id: a.id, revision: row.revision, photoOrder: [own[0].id] },
    ),
  );
  await assert.rejects(
    service.save(
      owner,
      command(
        { ...valid(), title: "Stale overwrite" },
        { id: a.id, revision: row.revision, photoOrder: [own[0].id] },
      ),
    ),
    (e: unknown) => e instanceof ListingError && e.code === "conflict",
  );
  assert.equal((await current(a.id)).payload.title, "First tab saved");
});
test("required and foreign category fields cannot bypass publication validation", async () => {
  await assert.rejects(
    service.save(
      owner,
      command(
        { ...valid(), attributes: {} },
        { mode: "publish", uploads: [file()], photoOrder: ["new:0"] },
      ),
    ),
    (e: unknown) => e instanceof ListingError && e.code === "requiredAttribute",
  );
  await assert.rejects(
    service.save(
      owner,
      command(
        { ...valid(), attributes: { [randomUUID()]: "value" } },
        { mode: "publish", uploads: [file()], photoOrder: ["new:0"] },
      ),
    ),
    ListingError,
  );
});
test("partial upload failures roll back draft changes and compensate uploaded objects", async () => {
  let calls = 0;
  const removed: string[] = [];
  const isolated = new ListingService(db, {
    save: async () => {
      if (++calls === 2) throw Error("upload failure");
      const key = randomUUID() + ".webp";
      keys.push(key);
      return key;
    },
    remove: async (key) => {
      removed.push(key);
    },
  });
  const before = (
    await db.query("SELECT count(*) FROM listing_drafts WHERE seller_id=$1", [
      owner,
    ])
  ).rows[0].count;
  await assert.rejects(
    isolated.save(
      owner,
      command(valid(), {
        uploads: [file(), file()],
        photoOrder: ["new:0", "new:1"],
      }),
    ),
    ListingError,
  );
  assert.equal(removed.length, 1);
  assert.equal(
    (
      await db.query("SELECT count(*) FROM listing_drafts WHERE seller_id=$1", [
        owner,
      ])
    ).rows[0].count,
    before,
  );
});
test("discarding a draft requires ownership and revision and queues its photos", async () => {
  const d = await service.save(
    owner,
    command(emptyPayload, { uploads: [file()], photoOrder: ["new:0"] }),
  );
  const row = await current(d.id),
    photo = (await images(d.id))[0];
  await assert.rejects(
    service.discard(other, d.id, row.revision),
    ListingError,
  );
  await assert.rejects(
    service.discard(owner, d.id, row.revision - 1),
    ListingError,
  );
  await service.discard(owner, d.id, row.revision);
  assert.equal(await current(d.id), undefined);
  assert.equal((await images(d.id)).length, 0);
  assert.equal(
    (
      await db.query(
        "SELECT storage_key FROM image_deletions WHERE storage_key=$1",
        [photo.storage_key],
      )
    ).rowCount,
    1,
  );
});
test("renewal validates current photos and required fields before reactivating an expired listing", async () => {
  const p = await service.save(
    owner,
    command(valid(), {
      mode: "publish",
      uploads: [file()],
      photoOrder: ["new:0"],
    }),
  );
  await db.query(
    "UPDATE listings SET status='EXPIRED',expires_at=now()-interval '1 day' WHERE id=$1",
    [p.id],
  );
  await service.activate(owner, p.id);
  const active = await current(p.id, "listing");
  assert.equal(active.status, "ACTIVE");
  assert.ok(new Date(active.expires_at).getTime() > Date.now());
  await db.query(
    "DELETE FROM listing_attribute_values WHERE listing_id=$1 AND attribute_id=$2",
    [p.id, requiredId],
  );
  await db.query("UPDATE listings SET status='EXPIRED' WHERE id=$1", [p.id]);
  await assert.rejects(
    service.activate(owner, p.id),
    (e: unknown) => e instanceof ListingError && e.code === "requiredAttribute",
  );
  assert.equal((await current(p.id, "listing")).status, "EXPIRED");
});
test("failed compensating object deletion is persisted for worker retry", async () => {
  let calls = 0;
  const key = randomUUID() + ".webp";
  keys.push(key);
  const failing = new ListingService(db, {
    save: async () => {
      if (++calls === 2) throw Error("upload unavailable");
      return key;
    },
    remove: async () => {
      throw Error("storage unavailable");
    },
  });
  await assert.rejects(
    failing.save(
      owner,
      command(valid(), {
        uploads: [file(), file()],
        photoOrder: ["new:0", "new:1"],
      }),
    ),
    ListingError,
  );
  assert.equal(
    (
      await db.query(
        "SELECT storage_key FROM image_deletions WHERE storage_key=$1",
        [key],
      )
    ).rowCount,
    1,
  );
});
