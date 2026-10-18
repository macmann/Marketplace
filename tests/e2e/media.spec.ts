import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { ListingService } from "../../lib/listing-service";
import { emptyPayload } from "../../lib/listing-validation";
import { deleteImage } from "../../lib/storage";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const ids: string[] = [];
const tokens: string[] = [];
let listing: string, key: string;
const title = "Manual media review " + randomUUID();
test.beforeAll(async () => {
  for (const role of ["USER", "MODERATOR", "SUPPORT"]) {
    const {
      rows: [u],
    } = await db.query(
      "INSERT INTO users(name,role,phone_verified) VALUES('Media browser fixture',$1,true) RETURNING id",
      [role],
    );
    ids.push(u.id);
    const token = randomBytes(32).toString("hex");
    tokens.push(token);
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [createHash("sha256").update(token).digest("hex"), u.id],
    );
  }
  await db.query("UPDATE marketplace_settings SET moderation_mode='MANUAL'");
  const buffer = await sharp({
    create: { width: 1900, height: 1200, channels: 3, background: "#987654" },
  })
    .withMetadata()
    .jpeg()
    .toBuffer();
  const result = await new ListingService(db).save(ids[0], {
    kind: "draft",
    revision: 0,
    mode: "publish",
    payload: {
      ...emptyPayload,
      title,
      description:
        "A media fixture for a real moderator to inspect before publication.",
      category: "home",
      location: "sanchaung",
      price: "5000",
    },
    photoOrder: ["new:0"],
    uploads: [new File([buffer], "photo.jpg", { type: "image/jpeg" })],
  });
  listing = result.id;
  key = (
    await db.query(
      "SELECT storage_key FROM listing_images WHERE listing_id=$1",
      [listing],
    )
  ).rows[0].storage_key;
});
test.afterAll(async () => {
  await db.query("UPDATE marketplace_settings SET moderation_mode='LOCAL'");
  await db.query("DELETE FROM audit_logs WHERE actor_id=ANY($1::uuid[])", [
    ids,
  ]);
  await db.query("DELETE FROM listings WHERE id=$1", [listing]);
  await db.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
  if (key) await deleteImage(key);
  await db.end();
});
test("processed media remains private until a moderator approves it and all variants revoke on removal", async ({
  page,
  browser,
}) => {
  const media = "/media/" + key;
  expect((await page.request.get(media + "?variant=card")).status()).toBe(404);
  const contexts = await Promise.all(
    tokens.map(async (token) => {
      const c = await browser.newContext();
      await c.addCookies([
        {
          name: "market_session",
          value: token,
          url: test.info().project.use.baseURL!,
          httpOnly: true,
        },
      ]);
      return c;
    }),
  );
  try {
    const owner = await contexts[0].request.get(media);
    expect(owner.status()).toBe(200);
    expect(owner.headers()["cache-control"]).toContain("no-store");
    await expect
      .poll(
        async () =>
          (
            await db.query(
              "SELECT automation_state FROM listings WHERE id=$1",
              [listing],
            )
          ).rows[0].automation_state,
        { timeout: 45000 },
      )
      .toBe("REVIEW");
    expect(
      (await db.query("SELECT status FROM listings WHERE id=$1", [listing]))
        .rows[0].status,
    ).toBe("PENDING_REVIEW");
    const support = await contexts[2].newPage();
    await support.goto("/admin/media");
    await expect(support).toHaveURL(/\/$/);
    const moderator = await contexts[1].newPage();
    await moderator.goto("/admin?q=" + encodeURIComponent(title));
    const row = moderator.locator(".admin-row").filter({ hasText: title });
    await row
      .getByLabel("Decision reason")
      .fill("Inspected the processed photograph");
    await row.getByRole("button", { name: "Approve", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await db.query("SELECT status FROM listings WHERE id=$1", [listing]))
            .rows[0].status,
      )
      .toBe("ACTIVE");
    for (const [variant, max] of [
      ["original", 1600],
      ["card", 640],
      ["thumb", 320],
    ] as const) {
      const response = await page.request.get(media + "?variant=" + variant);
      expect(response.status()).toBe(200);
      const metadata = await sharp(await response.body()).metadata();
      expect(Math.max(metadata.width!, metadata.height!)).toBeLessThanOrEqual(
        max,
      );
      expect(metadata.exif).toBeUndefined();
    }
    await moderator.goto("/admin?q=" + encodeURIComponent(title));
    await row
      .getByLabel("Decision reason")
      .fill("Removed after further inspection");
    await row.getByRole("button", { name: "Remove", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await db.query("SELECT status FROM listings WHERE id=$1", [listing]))
            .rows[0].status,
      )
      .toBe("REMOVED");
    expect((await page.request.get(media + "?variant=thumb")).status()).toBe(
      404,
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
