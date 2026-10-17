import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { saveImage, deleteImage } from "../../lib/storage";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const suffix = randomUUID();
const email = `lifecycle-${suffix}@example.test`;
const password = "account-test-password";
let id: string, key: string, listingId: string;
test.beforeAll(async () => {
  const r = await db.query(
    "INSERT INTO users(email,name,password_hash) VALUES($1,'Lifecycle member',$2) RETURNING id",
    [email, await hash(password, 12)],
  );
  id = r.rows[0].id;
  const image = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#e0e7d0" },
  })
    .jpeg()
    .toBuffer();
  key = await saveImage(
    new File([new Uint8Array(image)], "fixture.jpg", { type: "image/jpeg" }),
  );
  listingId = (
    await db.query(
      "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition) VALUES($1,'home','sanchaung','Lifecycle fixture','Temporary account deletion fixture','FREE',0,'GOOD') RETURNING id",
      [id],
    )
  ).rows[0].id;
  await db.query(
    "INSERT INTO listing_attribute_values(listing_id,attribute_id,value) SELECT $1,id,'\"Export fixture material\"'::jsonb FROM category_attributes WHERE category_id='home' AND key='material'",
    [listingId],
  );
  await db.query(
    "INSERT INTO listing_images(listing_id,storage_key,position) VALUES($1,$2,0)",
    [listingId, key],
  );
});
test.afterAll(async () => {
  if (key) {
    await deleteImage(key);
    await db.query("DELETE FROM image_deletions WHERE storage_key=$1", [key]);
  }
  if (id) {
    await db.query("DELETE FROM audit_logs WHERE actor_id=$1", [id]);
    await db.query("DELETE FROM listings WHERE seller_id=$1", [id]);
    await db.query("DELETE FROM users WHERE id=$1", [id]);
  }
  await db.end();
});
test("account export, session revocation, and confirmed account deletion", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const p = await first.newPage();
  const q = await second.newPage();
  try {
    expect((await p.request.get("/account/export")).status()).toBe(401);
    for (const page of [p, q]) {
      await page.goto("/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in", exact: false }).click();
      await expect(page).toHaveURL(/\/account$/);
    }
    const response = await p.request.get("/account/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const data = await response.json();
    expect(data.profile.email).toBe(email);
    expect(data.profile.password_hash).toBeUndefined();
    expect(
      data.listingAttributes.find(
        (v: { listing_id: string }) => v.listing_id === listingId,
      )?.value,
    ).toBe("Export fixture material");
    expect(data.sessions).toBeUndefined();
    expect(data.listings.some((l: { id: string }) => l.id === listingId)).toBe(
      true,
    );
    expect((await p.request.get("/media/" + key)).status()).toBe(200);
    await p.goto("/account/settings");
    await p
      .getByRole("button", { name: "Sign out other devices", exact: true })
      .click();
    await expect(p.getByRole("status")).toContainText(
      "Other devices have been signed out.",
    );
    await q.goto("/account");
    await expect(q).toHaveURL(/\/login$/);
    await db.query(
      "UPDATE sessions SET authenticated_at=now()-interval '1 hour' WHERE user_id=$1",
      [id],
    );
    await p
      .getByLabel("Type DELETE to confirm", { exact: true })
      .fill("DELETE");
    await p
      .getByRole("button", { name: "Permanently delete account", exact: true })
      .click();
    await expect(
      p.getByRole("alert").filter({ hasText: "current password" }),
    ).toContainText("current password");
    expect(
      (await db.query("SELECT deleted_at FROM users WHERE id=$1", [id])).rows[0]
        .deleted_at,
    ).toBeNull();
    await p
      .getByLabel("Current password (if you signed in over 15 minutes ago)", {
        exact: true,
      })
      .fill(password);
    await p
      .getByLabel("Type DELETE to confirm", { exact: true })
      .fill("DELETE");
    await p
      .getByRole("button", { name: "Permanently delete account", exact: true })
      .click();
    await expect(p).toHaveURL(/\/login\?deleted=1$/);
    await expect(
      p
        .getByRole("status")
        .filter({ hasText: "Your account has been deleted." }),
    ).toBeVisible();
    expect((await p.request.get("/account/export")).status()).toBe(401);
    expect((await p.request.get("/media/" + key)).status()).toBe(404);
    const row = (
      await db.query("SELECT email,phone,deleted_at FROM users WHERE id=$1", [
        id,
      ])
    ).rows[0];
    expect(row.email).toBeNull();
    expect(row.phone).toBeNull();
    expect(row.deleted_at).toBeTruthy();
    expect(
      (
        await db.query(
          "SELECT * FROM listing_attribute_values WHERE listing_id=$1",
          [listingId],
        )
      ).rowCount,
    ).toBe(0);
    await p.goto("/account");
    await expect(p).toHaveURL(/\/login$/);
  } finally {
    await first.close();
    await second.close();
  }
});
test("missing SMS configuration fails closed and recovery gives clear guidance", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", {
      name: "Continue with your phone",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send verification code", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Recover your account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send verification code", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Accounts without a verified phone cannot use SMS recovery/),
  ).toBeVisible();
});
