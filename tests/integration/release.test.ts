import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { pool as catalogPool } from "../../lib/db";
import { catalog } from "../../lib/marketplace";
import { ModerationService } from "../../lib/moderation";
import { ListingService } from "../../lib/listing-service";
import { emptyPayload } from "../../lib/listing-validation";
import { createReport } from "../../lib/reporting";
import { deliverPush } from "../../lib/push";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const users: string[] = [],
  category = "release-" + randomUUID(),
  child = category + "-child";
let seller: string,
  buyer: string,
  outsider: string,
  moderator: string,
  support: string,
  admin: string,
  field: string,
  num: string;
const service = new ListingService(db, {
  save: async () => randomUUID() + ".webp",
  remove: async () => {},
});
const moderation = new ModerationService(db);
const draft = (
  title: string,
  description = "A solid wooden chair in good condition.",
) => ({
  kind: "draft" as const,
  revision: 0,
  mode: "publish" as const,
  payload: {
    ...emptyPayload,
    title,
    description,
    category: child,
    location: "sanchaung",
    price: "12000",
    attributes: {},
  },
  uploads: [new File(["test"], "chair.jpg", { type: "image/jpeg" })],
  photoOrder: ["new:0"],
});
before(async () => {
  for (const role of [
    "USER",
    "USER",
    "USER",
    "MODERATOR",
    "SUPPORT",
    "ADMIN",
  ]) {
    const {
      rows: [u],
    } = await db.query(
      "INSERT INTO users(name,role,phone_verified) VALUES('Release fixture',$1,true) RETURNING id",
      [role],
    );
    users.push(u.id);
  }
  [seller, buyer, outsider, moderator, support, admin] = users;
  await db.query(
    "INSERT INTO categories(id,name_en,name_my) VALUES($1,'Release category','စမ်းသပ်မှု')",
    [category],
  );
  await db.query(
    "INSERT INTO categories(id,parent_id,name_en,name_my) VALUES($1,$2,'Child category','စမ်းသပ်မှု')",
    [child, category],
  );
  field = (
    await db.query(
      "INSERT INTO category_attributes(category_id,key,name_en,name_my,type) VALUES($1,'test_bool','Release bool','စမ်းသပ်မှု','BOOLEAN') RETURNING id",
      [category],
    )
  ).rows[0].id;
  num = (
    await db.query(
      "INSERT INTO category_attributes(category_id,key,name_en,name_my,type) VALUES($1,'test_number','Release number','စမ်းသပ်မှု','NUMBER') RETURNING id",
      [category],
    )
  ).rows[0].id;
});
after(async () => {
  await db.query("DELETE FROM reports WHERE reporter_id=ANY($1::uuid[])", [
    users,
  ]);
  await db.query("DELETE FROM audit_logs WHERE actor_id=ANY($1::uuid[])", [
    users,
  ]);
  await db.query(
    "DELETE FROM conversations WHERE buyer_id=ANY($1::uuid[]) OR seller_id=ANY($1::uuid[])",
    [users],
  );
  await db.query("DELETE FROM listings WHERE seller_id=ANY($1::uuid[])", [
    users,
  ]);
  await db.query("DELETE FROM listing_drafts WHERE seller_id=ANY($1::uuid[])", [
    users,
  ]);
  await db.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [users]);
  await db.query("DELETE FROM category_attributes WHERE category_id=$1", [
    category,
  ]);
  await db.query("DELETE FROM categories WHERE id=$1", [child]);
  await db.query("DELETE FROM categories WHERE id=$1", [category]);
  await db.end();
  await catalogPool.end();
});
// These discovery/moderator tests use fake storage; full image/queue behavior is covered in media.test.ts.
async function readyForReview(id: string, active = false) {
  await db.query(
    "UPDATE listing_images SET processing_state='READY' WHERE listing_id=$1",
    [id],
  );
  await db.query(
    "UPDATE listings SET automation_state=$2,status=CASE WHEN $3 THEN 'ACTIVE' ELSE status END WHERE id=$1",
    [id, active ? "PASSED" : "REVIEW", active],
  );
  await db.query("DELETE FROM moderation_jobs WHERE listing_id=$1", [id]);
}
test("discovery searches normalized mixed-language terms and descendants with typed false/zero filters", async () => {
  const cmd = draft("Cafe\u0301 ကုလားထိုင် " + randomUUID());
  cmd.payload.attributes = { [field]: "false", [num]: "0" };
  const listing = await service.save(seller, cmd);
  await readyForReview(listing.id, true);
  const filters = {
    q: "ကုလားထိုင် café",
    category,
    ["attr_" + field]: "false",
    ["attr_" + num]: "0",
  };
  assert.ok((await catalog(filters)).some((l) => l.id === listing.id));
  assert.equal(
    (await catalog({ ...filters, ["attr_" + field]: "true" })).length,
    0,
  );
  assert.equal(
    (await catalog({ ...filters, ["attr_" + num]: "oops" })).length,
    0,
  );
  assert.equal((await catalog({ ...filters, q: "%_injection" })).length, 0);
  await db.query("UPDATE listings SET status='PENDING_REVIEW' WHERE id=$1", [
    listing.id,
  ]);
  assert.equal((await catalog(filters)).length, 0);
  assert.ok((await catalog({}, seller)).some((l) => l.id === listing.id));
  assert.equal(
    (await catalog({}, seller, undefined, true)).some(
      (l) => l.id === listing.id,
    ),
    false,
  );
});
test("English typo matching and common Myanmar synonyms discover listings", async () => {
  const l = await service.save(
    seller,
    draft("iPhone ကုလားထိုင် " + randomUUID()),
  );
  await readyForReview(l.id, true);
  assert.ok(
    (await catalog({ category, q: "iphne" })).some((r) => r.id === l.id),
  );
  assert.ok(
    (await catalog({ category, q: "chair" })).some((r) => r.id === l.id),
  );
  for (const sort of ["newest", "low", "high", "near"]) {
    assert.ok(
      (
        await catalog({ category, q: "chair", sort, location: "sanchaung" })
      ).some((r) => r.id === l.id),
    );
  }
  await db.query("UPDATE categories SET enabled=false WHERE id=$1", [category]);
  try {
    assert.equal(
      (await catalog({ q: "iphne" })).some((r) => r.id === l.id),
      false,
    );
  } finally {
    await db.query("UPDATE categories SET enabled=true WHERE id=$1", [
      category,
    ]);
  }
});
test("flagged publication, edits, duplicates and resubmission require moderator review with revisions", async () => {
  const phrase = "flagged-" + randomUUID();
  await db.query("INSERT INTO moderation_rules(phrase) VALUES($1)", [phrase]);
  try {
    const cmd = draft("Review chair " + phrase),
      l = await service.save(seller, cmd);
    const current = async () =>
      (await db.query("SELECT * FROM listings WHERE id=$1", [l.id])).rows[0];
    assert.equal((await current()).status, "PENDING_REVIEW");
    await assert.rejects(
      moderation.act(support, l.id, "APPROVE", "Reviewed"),
      /Forbidden/,
    );
    await assert.rejects(
      moderation.act(outsider, l.id, "APPROVE", "Reviewed"),
      /Forbidden/,
    );
    await assert.rejects(
      moderation.act(moderator, l.id, "APPROVE", ""),
      /reason/,
    );
    await assert.rejects(
      moderation.act(moderator, l.id, "APPROVE", "Reviewed", 999),
      /changed/,
    );
    await readyForReview(l.id);
    await moderation.act(
      moderator,
      l.id,
      "APPROVE",
      "Reviewed and permitted",
      (await current()).revision,
    );
    assert.equal((await current()).status, "ACTIVE");
    await assert.rejects(
      moderation.act(moderator, l.id, "APPROVE", "Again"),
      /no longer pending/,
    );
    const photos = (
      await db.query("SELECT id FROM listing_images WHERE listing_id=$1", [
        l.id,
      ])
    ).rows;
    await service.save(seller, {
      ...cmd,
      kind: "listing",
      id: l.id,
      mode: "save",
      revision: (await current()).revision,
      uploads: [],
      photoOrder: photos.map((p) => p.id),
    });
    assert.equal((await current()).status, "PENDING_REVIEW");
    await moderation.act(moderator, l.id, "REJECT", "Prohibited item");
    await service.save(seller, {
      ...cmd,
      payload: { ...cmd.payload, title: "Corrected " + randomUUID() },
      kind: "listing",
      id: l.id,
      mode: "save",
      revision: (await current()).revision,
      uploads: [],
      photoOrder: photos.map((p) => p.id),
    });
    assert.equal((await current()).status, "PENDING_REVIEW");
    const duplicate = draft("Duplicate chair " + randomUUID());
    await service.save(seller, duplicate);
    const second = await service.save(seller, duplicate);
    assert.equal(
      (await db.query("SELECT status FROM listings WHERE id=$1", [second.id]))
        .rows[0].status,
      "PENDING_REVIEW",
    );
  } finally {
    await db.query("DELETE FROM moderation_rules WHERE phrase=$1", [phrase]);
  }
});
test("moderation restoration preserves sold state and never silently republishes legacy removals", async () => {
  const l = await service.save(
    seller,
    draft("Restoration chair " + randomUUID()),
  );
  await db.query("UPDATE listings SET status='SOLD' WHERE id=$1", [l.id]);
  await moderation.act(moderator, l.id, "REMOVE", "Reported sold listing");
  await moderation.act(moderator, l.id, "RESTORE", "Appeal accepted");
  assert.equal(
    (await db.query("SELECT status FROM listings WHERE id=$1", [l.id])).rows[0]
      .status,
    "SOLD",
  );
  await db.query(
    "UPDATE listings SET status='REMOVED',removed_from=NULL WHERE id=$1",
    [l.id],
  );
  await moderation.act(moderator, l.id, "RESTORE", "Legacy removal reviewed");
  assert.equal(
    (await db.query("SELECT status FROM listings WHERE id=$1", [l.id])).rows[0]
      .status,
    "PENDING_REVIEW",
  );
});
test("reports protect message membership, consolidate duplicates and allow support resolution only", async () => {
  const l = await service.save(seller, draft("Report chair " + randomUUID()));
  const {
    rows: [c],
  } = await db.query(
    "INSERT INTO conversations(listing_id,buyer_id,seller_id) VALUES($1,$2,$3) RETURNING id",
    [l.id, buyer, seller],
  );
  const {
    rows: [m],
  } = await db.query(
    "INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,'Reported message fixture') RETURNING id",
    [c.id, buyer],
  );
  await assert.rejects(
    createReport(outsider, "message", m.id, "Harassment", "", db),
    /unavailable/,
  );
  await assert.rejects(
    createReport(buyer, "message", m.id, "Harassment", "", db),
    /unavailable/,
  );
  await createReport(
    seller,
    "message",
    m.id,
    "Harassment",
    "Report fixture",
    db,
  );
  await createReport(seller, "message", m.id, "Spam", "Duplicate", db);
  const reports = await db.query("SELECT * FROM reports WHERE message_id=$1", [
    m.id,
  ]);
  assert.equal(reports.rowCount, 1);
  await moderation.act(
    support,
    reports.rows[0].id,
    "RESOLVE",
    "Reviewed report",
  );
  await assert.rejects(
    moderation.act(support, reports.rows[0].id, "RESOLVE", "Again"),
    /changed/,
  );
  await assert.rejects(
    moderation.act(support, buyer, "SUSPEND", "Abuse"),
    /Forbidden/,
  );
  await assert.rejects(
    moderation.act(moderator, admin, "SUSPEND", "Abuse"),
    /unavailable/,
  );
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [randomUUID(), outsider],
  );
  await moderation.act(moderator, outsider, "SUSPEND", "Abuse");
  assert.equal(
    (await db.query("SELECT * FROM sessions WHERE user_id=$1", [outsider]))
      .rowCount,
    0,
  );
  await moderation.act(moderator, outsider, "UNSUSPEND", "Appeal accepted");
  const resolved = (
    await db.query("SELECT * FROM reports WHERE id=$1", [reports.rows[0].id])
  ).rows[0];
  assert.equal(
    (
      await db.query(
        "SELECT state FROM notifications WHERE report_id=$1 AND user_id=$2",
        [reports.rows[0].id, seller],
      )
    ).rows[0].state,
    "RESOLVED",
  );
  assert.equal(resolved.resolved_by, support);
  assert.ok(resolved.resolved_at);
});
test("notifications and push outbox are transactional, retry failures and remove expired subscriptions", async () => {
  const endpoint = "https://fcm.googleapis.com/send/" + randomUUID();
  const {
    rows: [sub],
  } = await db.query(
    "INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4) RETURNING id",
    [seller, endpoint, "A".repeat(87), "B".repeat(22)],
  );
  const l = await service.save(
    seller,
    draft("Notification chair " + randomUUID()),
  );
  const {
    rows: [c],
  } = await db.query(
    "INSERT INTO conversations(listing_id,buyer_id,seller_id) VALUES($1,$2,$3) RETURNING id",
    [l.id, buyer, seller],
  );
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,'Rolled back')",
      [c.id, buyer],
    );
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
  assert.equal(
    (
      await db.query("SELECT * FROM notifications WHERE conversation_id=$1", [
        c.id,
      ])
    ).rowCount,
    0,
  );
  await db.query(
    "INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,'Committed')",
    [c.id, buyer],
  );
  const {
    rows: [n],
  } = await db.query("SELECT * FROM notifications WHERE conversation_id=$1", [
    c.id,
  ]);
  assert.equal(n.user_id, seller);
  await db.query(
    "DELETE FROM push_deliveries WHERE notification_id IN (SELECT id FROM notifications WHERE user_id=$1 AND kind<>'MESSAGE')",
    [seller],
  );
  let calls = 0;
  await deliverPush(db, async () => {
    calls++;
    throw Error("Provider unavailable");
  });
  assert.equal(calls, 1);
  assert.equal(
    (
      await db.query(
        "SELECT attempts FROM push_deliveries WHERE notification_id=$1",
        [n.id],
      )
    ).rows[0].attempts,
    1,
  );
  await db.query(
    "UPDATE push_deliveries SET next_attempt=now() WHERE notification_id=$1",
    [n.id],
  );
  await deliverPush(db, async () => {
    calls++;
  });
  assert.equal(calls, 2);
  assert.equal(
    (
      await db.query("SELECT * FROM push_deliveries WHERE notification_id=$1", [
        n.id,
      ])
    ).rowCount,
    0,
  );
  await db.query(
    "INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,'Another')",
    [c.id, buyer],
  );
  await deliverPush(db, async () => {
    throw Object.assign(Error("Expired"), { statusCode: 410 });
  });
  assert.equal(
    (await db.query("SELECT * FROM push_subscriptions WHERE id=$1", [sub.id]))
      .rowCount,
    0,
  );
});
