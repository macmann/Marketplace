import { test, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import sharp from "sharp";
import { saveImage, deleteImage } from "../../lib/storage";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const suffix = randomUUID();
const email = "draft-" + suffix + "@example.test",
  outsiderEmail = "draft-other-" + suffix + "@example.test",
  adminEmail = "draft-admin-" + suffix + "@example.test";
const password = "listing-editor-test-password";
let owner: string, other: string, admin: string, category: string;
const keys = new Set<string>();
async function login(p: Page, email: string) {
  await p.goto("/login");
  await p.getByLabel("Email", { exact: true }).fill(email);
  await p.getByLabel("Password", { exact: true }).fill(password);
  await p.getByRole("button", { name: "Log in", exact: false }).click();
  await expect(p).toHaveURL(/\/account$/);
}
async function photo(color: string, name: string) {
  return {
    name,
    mimeType: "image/jpeg",
    buffer: await sharp({
      create: { width: 160, height: 100, channels: 3, background: color },
    })
      .jpeg()
      .toBuffer(),
  };
}
test.beforeAll(async () => {
  const digest = await hash(password, 12);
  for (const [address, role] of [
    [email, "USER"],
    [outsiderEmail, "USER"],
    [adminEmail, "ADMIN"],
  ]) {
    const {
      rows: [u],
    } = await db.query(
      "INSERT INTO users(email,name,password_hash,role) VALUES($1,'Editor fixture',$2,$3) RETURNING id",
      [address, digest, role],
    );
    if (role === "ADMIN") admin = u.id;
    else if (!owner) owner = u.id;
    else other = u.id;
  }
  category = "editor-" + suffix;
  await db.query(
    "INSERT INTO categories(id,name_en,name_my,parent_id) VALUES($1,$2,'စမ်းသပ်မှု','home')",
    [category, "Editor category " + suffix],
  );
  await db.query(
    "INSERT INTO category_attributes(category_id,key,name_en,name_my,type,choices,required) VALUES($1,'finish','Finish test','အချောသတ်','ENUM','[\"Natural\",\"Painted\"]',true),($1,'assembly_test','Assembly test','တပ်ဆင်မှု','BOOLEAN','[]',false)",
    [category],
  );
});
test.afterAll(async () => {
  const media = await db.query(
    "SELECT i.storage_key FROM listing_images i LEFT JOIN listings l ON l.id=i.listing_id LEFT JOIN listing_drafts d ON d.id=i.draft_id WHERE l.seller_id=$1 OR d.seller_id=$1",
    [owner],
  );
  for (const i of media.rows) keys.add(i.storage_key);
  for (const key of keys) {
    await deleteImage(key);
    await db.query("DELETE FROM image_deletions WHERE storage_key=$1", [key]);
  }
  for (const id of [owner, other, admin]) {
    await db.query("DELETE FROM audit_logs WHERE actor_id=$1", [id]);
    await db.query("DELETE FROM listing_drafts WHERE seller_id=$1", [id]);
    await db.query("DELETE FROM listings WHERE seller_id=$1", [id]);
    await db.query("DELETE FROM users WHERE id=$1", [id]);
  }
  await db.query("DELETE FROM category_attributes WHERE category_id=$1", [
    category,
  ]);
  await db.query("DELETE FROM categories WHERE id=$1", [category]);
  await db.end();
});
test("private drafts, stale tabs, typed fields and photo editing work end to end", async ({
  browser,
}) => {
  const context = await browser.newContext(),
    outsider = await browser.newContext(),
    anonymous = await browser.newContext();
  const p = await context.newPage(),
    q = await outsider.newPage();
  try {
    await login(p, email);
    await login(q, outsiderEmail);
    await p.goto("/sell");
    await p
      .getByLabel("Title", { exact: true })
      .fill("Private draft " + suffix);
    await p
      .getByLabel("Photos (1–10)", { exact: true })
      .setInputFiles([
        await photo("#af875d", "one.jpg"),
        await photo("#7f9d67", "two.jpg"),
      ]);
    await expect(p.locator(".editor-photo")).toHaveCount(2);
    await p.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(p).toHaveURL(/\/sell\/draft\//);
    const draftId = p.url().split("/").pop()!.split("?")[0];
    const before = (
      await db.query(
        "SELECT * FROM listing_images WHERE draft_id=$1 ORDER BY position",
        [draftId],
      )
    ).rows;
    for (const im of before) keys.add(im.storage_key);
    expect(before).toHaveLength(2);
    expect(
      (await p.request.get("/media/" + before[0].storage_key)).status(),
    ).toBe(200);
    expect(
      (await anonymous.request.get("/media/" + before[0].storage_key)).status(),
    ).toBe(404);
    expect(
      (await q.request.get("/media/" + before[0].storage_key)).status(),
    ).toBe(404);
    expect((await q.goto("/sell/draft/" + draftId))?.status()).toBe(404);
    expect(
      (await db.query("SELECT id FROM listings WHERE id=$1", [draftId]))
        .rowCount,
    ).toBe(0);
    const stale = await context.newPage();
    await stale.goto("/sell/draft/" + draftId);
    await p
      .getByLabel("Title", { exact: true })
      .fill("Resumed chair " + suffix);
    await p.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(p).toHaveURL(/saved=1$/);
    await stale.getByLabel("Title", { exact: true }).fill("Stale overwrite");
    await stale
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await expect(
      stale.getByRole("alert").filter({ hasText: "changed in another tab" }),
    ).toBeVisible();
    expect(
      (
        await db.query("SELECT payload FROM listing_drafts WHERE id=$1", [
          draftId,
        ])
      ).rows[0].payload.title,
    ).toBe("Resumed chair " + suffix);
    await stale.close();
    await p
      .getByLabel("Description", { exact: true })
      .fill("A useful wooden chair ready for its next home.");
    await p
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption(category);
    await p
      .getByRole("combobox", { name: "Finish test", exact: true })
      .selectOption("Natural");
    await p
      .getByRole("combobox", { name: "Assembly test", exact: true })
      .selectOption("false");
    await p.getByLabel("Price (MMK)", { exact: true }).fill("15000");
    await p
      .getByRole("combobox", { name: "Location", exact: true })
      .selectOption("sanchaung");
    await p
      .getByRole("button", { name: "Move photo later 1", exact: true })
      .click();
    await p.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(p).toHaveURL(/saved=1$/);
    await p
      .getByRole("button", { name: "Publish listing", exact: false })
      .click();
    await expect(
      p.getByRole("alert").filter({ hasText: "Verify your phone" }),
    ).toBeVisible();
    await db.query("UPDATE users SET phone_verified=true WHERE id=$1", [owner]);
    await p.reload();
    await p
      .getByRole("button", { name: "Publish listing", exact: false })
      .click();
    await expect(p).toHaveURL(/\/listing\//);
    const id = p.url().split("/").pop()!;
    expect(
      (await db.query("SELECT id FROM listing_drafts WHERE id=$1", [draftId]))
        .rowCount,
    ).toBe(0);
    await expect(p.locator(".attribute-list")).toContainText("Natural");
    await expect(p.locator(".attribute-list")).toContainText("No");
    const published = (
      await db.query(
        "SELECT * FROM listing_images WHERE listing_id=$1 ORDER BY position",
        [id],
      )
    ).rows;
    expect(published[0].storage_key).toBe(before[1].storage_key);
    expect(
      (await anonymous.request.get("/media/" + before[1].storage_key)).status(),
    ).toBe(200);
    await p.goto("/sell/" + id);
    await p
      .getByRole("button", { name: "Remove photo 2", exact: true })
      .click();
    await p
      .getByLabel("Photos (1–10)", { exact: true })
      .setInputFiles(await photo("#c48d77", "replacement.jpg"));
    await expect(p.locator(".editor-photo")).toHaveCount(2);
    await p
      .getByRole("button", { name: "Move photo earlier 2", exact: true })
      .click();
    await p
      .getByRole("combobox", { name: "Finish test", exact: true })
      .selectOption("Painted");
    await p.getByRole("button", { name: "Update", exact: false }).click();
    await expect(p).toHaveURL(/\/account\/listings$/);
    const updated = (
      await db.query(
        "SELECT * FROM listing_images WHERE listing_id=$1 ORDER BY position",
        [id],
      )
    ).rows;
    for (const im of updated) keys.add(im.storage_key);
    expect(updated[1].storage_key).toBe(before[1].storage_key);
    expect(updated[0].storage_key).not.toBe(before[0].storage_key);
    expect(
      (await anonymous.request.get("/media/" + before[0].storage_key)).status(),
    ).toBe(404);
    await p.goto("/listing/" + id);
    await expect(p.locator(".attribute-list")).toContainText("Painted");
  } finally {
    await context.close();
    await outsider.close();
    await anonymous.close();
  }
});
test("administrator fields are configurable and draft photos stay private from admins", async ({
  page,
  browser,
}) => {
  const {
    rows: [d],
  } = await db.query(
    "INSERT INTO listing_drafts(seller_id,payload) VALUES($1,'{}') RETURNING id",
    [owner],
  );
  const fixture = await photo("#a7b579", "private.jpg");
  const key = await saveImage(
    new File([new Uint8Array(fixture.buffer)], fixture.name, {
      type: fixture.mimeType,
    }),
  );
  keys.add(key);
  await db.query(
    "INSERT INTO listing_images(draft_id,storage_key,position) VALUES($1,$2,0)",
    [d.id, key],
  );
  await login(page, adminEmail);
  expect((await page.request.get("/media/" + key)).status()).toBe(404);
  await page.goto("/admin/attributes");
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Add field", exact: true }),
  });
  await form
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption(category);
  await form.getByLabel("Field key", { exact: true }).fill("length_test");
  await form.getByLabel("English label", { exact: true }).fill("Length test");
  await form.getByLabel("Myanmar label", { exact: true }).fill("အလျား");
  await form
    .getByRole("combobox", { name: "Field type", exact: false })
    .selectOption("NUMBER");
  await form.getByRole("button", { name: "Add field", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Category field saved." }),
  ).toBeVisible();
  expect(
    (
      await db.query(
        "SELECT type FROM category_attributes WHERE category_id=$1 AND key='length_test'",
        [category],
      )
    ).rows[0].type,
  ).toBe("NUMBER");
  const own = await browser.newContext();
  const p = await own.newPage();
  try {
    await login(p, email);
    expect((await p.request.get("/media/" + key)).status()).toBe(200);
    await p.goto("/account/drafts");
    const card = p.locator(".draft-card").filter({ hasText: "Untitled draft" });
    await card.getByText("Discard draft", { exact: true }).click();
    await card
      .getByRole("button", {
        name: "Discard this draft and its photos?",
        exact: true,
      })
      .click();
    await expect(p.getByRole("status")).toContainText("Draft discarded.");
    expect(
      (await db.query("SELECT id FROM listing_drafts WHERE id=$1", [d.id]))
        .rowCount,
    ).toBe(0);
  } finally {
    await own.close();
  }
});
