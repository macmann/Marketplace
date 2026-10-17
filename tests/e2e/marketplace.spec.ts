import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { deleteImage } from "../../lib/storage";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const suffix = randomUUID();
const sellerEmail = `seller-${suffix}@example.test`,
  buyerEmail = `buyer-${suffix}@example.test`;
const password = "test-password-long-enough";
let sellerId: string, buyerId: string, listingId: string, threadId: string;
test.beforeAll(async () => {
  for (const [email, name, verified] of [
    [sellerEmail, "Test Seller", true],
    [buyerEmail, "Test Buyer", false],
  ] as const) {
    const r = await pool.query(
      "INSERT INTO users(email,name,password_hash,phone_verified) VALUES($1,$2,$3,$4) RETURNING id",
      [email, name, await hash(password, 12), verified],
    );
    if (verified) sellerId = r.rows[0].id;
    else buyerId = r.rows[0].id;
  }
});
test.afterAll(async () => {
  const images = await pool.query(
    "SELECT i.storage_key FROM listing_images i JOIN listings l ON l.id=i.listing_id WHERE l.seller_id=$1",
    [sellerId],
  );
  await Promise.all(images.rows.map((i) => deleteImage(i.storage_key)));
  await pool.query("DELETE FROM users WHERE email=$1", [
    `visitor-${suffix}@example.test`,
  ]);
  await pool.query("DELETE FROM reports WHERE reporter_id=$1", [buyerId]);
  await pool.query(
    "DELETE FROM conversations WHERE buyer_id=$1 OR seller_id=$2",
    [buyerId, sellerId],
  );
  await pool.query("DELETE FROM listings WHERE seller_id=$1", [sellerId]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
    [sellerId, buyerId],
  ]);
  await pool.end();
});
test("core marketplace journey and access control", async ({ browser }) => {
  const seller = await browser.newContext();
  const s = await seller.newPage();
  await s.goto("/login");
  await s.getByLabel("Email", { exact: true }).fill(sellerEmail);
  await s.getByLabel("Password", { exact: true }).fill(password);
  await s.getByRole("button", { name: "Log in" }).click();
  await expect(s).toHaveURL(/\/account$/);
  await s.goto("/sell");
  await s
    .getByLabel("Title", { exact: true })
    .fill("Test teak chair " + suffix);
  await s
    .getByLabel("Description", { exact: true })
    .fill("Solid wooden chair, available in Sanchaung. စားပွဲ ကုလားထိုင်");
  await s
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("home");
  await s
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("sanchaung");
  await s.getByLabel("Price (MMK)", { exact: true }).fill("45000");
  const image = await sharp({
    create: { width: 200, height: 200, channels: 3, background: "#b88d55" },
  })
    .jpeg()
    .toBuffer();
  await s.getByLabel("Photos (1–10)").setInputFiles({
    name: "chair.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await s.getByRole("button", { name: "Publish listing" }).click();
  await expect(s).toHaveURL(/\/listing\//);
  listingId = s.url().split("/").pop()!;
  await expect(
    s.getByRole("heading", { name: "Test teak chair " + suffix }),
  ).toBeVisible();
  expect((await s.request.get("/api/health")).status()).toBe(200);
  const media = await s.locator(".detail-photo img").getAttribute("src");
  const mediaResponse = await s.request.get(media!);
  expect(mediaResponse.status()).toBe(200);
  const outputMeta = await sharp(await mediaResponse.body()).metadata();
  expect(outputMeta.format).toBe("webp");
  expect(outputMeta.exif).toBeUndefined();
  await s.goto("/sell/" + listingId);
  await s.getByLabel("Price (MMK)", { exact: true }).fill("42000");
  await s.getByRole("button", { name: "Update", exact: true }).click();
  await expect(s).toHaveURL(/\/account\/listings$/);
  expect(
    (await pool.query("SELECT price FROM listings WHERE id=$1", [listingId]))
      .rows[0].price,
  ).toBe("42000");
  const buyer = await browser.newContext();
  const b = await buyer.newPage();
  await b.goto("/login");
  await b.getByLabel("Email", { exact: true }).fill(buyerEmail);
  await b.getByLabel("Password", { exact: true }).fill(password);
  await b.getByRole("button", { name: "Log in" }).click();
  await expect(b).toHaveURL(/\/account$/);
  await b.goto("/sell");
  await expect(b).toHaveURL(/\/verify$/);
  await expect(
    b.getByRole("button", { name: "Send verification code" }),
  ).toBeDisabled();
  await b.goto("/?q=" + encodeURIComponent("ကုလားထိုင်"));
  await expect(
    b.getByRole("heading", { name: "Test teak chair " + suffix }),
  ).toBeVisible();
  await b.goto("/listing/" + listingId);
  await b.getByRole("button", { name: "♡ Save", exact: true }).click();
  await b.goto("/account/favorites");
  await expect(
    b.getByRole("heading", { name: "Test teak chair " + suffix }),
  ).toBeVisible();
  await b.goto("/listing/" + listingId);
  await b.getByRole("button", { name: "Message seller" }).click();
  await expect(b).toHaveURL(/\/account\/messages\//);
  threadId = b.url().split("/").pop()!;
  await b
    .getByRole("textbox", { name: "Your message" })
    .fill("Is this still available?");
  await b.getByRole("button", { name: "Send message" }).click();
  await expect(
    b.getByText("Is this still available?", { exact: true }),
  ).toBeVisible();
  await s.goto("/account/messages/" + threadId);
  await expect(
    s.getByText("Is this still available?", { exact: true }),
  ).toBeVisible();
  await s
    .getByRole("textbox", { name: "Your message" })
    .fill("Yes, available in Sanchaung.");
  await s.getByRole("button", { name: "Send message" }).click();
  await expect(
    s.getByText("Yes, available in Sanchaung.", { exact: true }),
  ).toBeVisible();
  const outsider = await browser.newContext();
  const o = await outsider.newPage();
  await o.goto("/register");
  await o.getByLabel("Display name", { exact: true }).fill("Test Visitor");
  const outsiderEmail = `visitor-${suffix}@example.test`;
  await o.getByLabel("Email", { exact: true }).fill(outsiderEmail);
  await o.getByLabel("Password", { exact: true }).fill(password);
  await o.getByRole("button", { name: "Create account" }).click();
  await expect(o).toHaveURL(/\/account$/);
  const forbiddenEdit = await o.goto("/sell/" + listingId);
  expect(forbiddenEdit?.status()).toBe(404);
  const forbidden = await o.goto("/account/messages/" + threadId);
  expect(forbidden?.status()).toBe(404);
  const admin = await o.goto("/admin");
  expect(admin?.url()).not.toContain("/admin");
  await pool.query("DELETE FROM users WHERE email=$1", [outsiderEmail]);
  await outsider.close();
  await b.goto("/listing/" + listingId);
  await b.getByText("Report listing", { exact: true }).click();
  await b
    .getByRole("combobox", { name: "Reason", exact: true })
    .selectOption("Scam");
  await b
    .getByLabel("Additional details", { exact: true })
    .fill("Integration test report");
  await b.getByRole("button", { name: "Submit report" }).click();
  await expect(b.getByRole("status")).toContainText("moderation queue");
  await s.goto("/account/listings");
  await s.getByRole("combobox", { name: "Status" }).selectOption("RESERVED");
  await s.getByRole("button", { name: "Update", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await pool.query("SELECT status FROM listings WHERE id=$1", [
            listingId,
          ])
        ).rows[0].status,
    )
    .toBe("RESERVED");
  await s.getByRole("combobox", { name: "Status" }).selectOption("SOLD");
  await s.getByRole("button", { name: "Update", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await pool.query("SELECT status FROM listings WHERE id=$1", [
            listingId,
          ])
        ).rows[0].status,
    )
    .toBe("SOLD");
  await b.goto("/listing/" + listingId);
  await expect(b.getByRole("button", { name: "Message seller" })).toHaveCount(
    0,
  );
  await buyer.close();
  await seller.close();
});
test("mobile navigation, localization, and private route redirects", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good things. Closer to home." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "◎ မြန်မာ" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "my");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("administrators moderate listings and manage reference data with audit records", async ({
  page,
}) => {
  const email = `admin-${suffix}@example.test`;
  const {
    rows: [admin],
  } = await pool.query(
    "INSERT INTO users(email,name,password_hash,role) VALUES($1,'Test Administrator',$2,'ADMIN') RETURNING id",
    [email, await hash(password, 12)],
  );
  const {
    rows: [listing],
  } = await pool.query(
    "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition) VALUES($1,'home','sanchaung',$2,'Moderation integration fixture','FREE',0,'GOOD') RETURNING id",
    [sellerId, "Moderation fixture " + suffix],
  );
  const categoryId = "test-" + suffix;
  try {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/admin");
    const row = page
      .locator(".admin-row")
      .filter({ hasText: "Moderation fixture " + suffix });
    await row.getByRole("button", { name: "Remove", exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await pool.query("SELECT status FROM listings WHERE id=$1", [
              listing.id,
            ])
          ).rows[0].status,
      )
      .toBe("REMOVED");
    const context = await page.context().browser()!.newContext();
    const publicPage = await context.newPage();
    expect((await publicPage.goto("/listing/" + listing.id))?.status()).toBe(
      404,
    );
    await context.close();
    await row.getByRole("button", { name: "Restore", exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await pool.query("SELECT status FROM listings WHERE id=$1", [
              listing.id,
            ])
          ).rows[0].status,
      )
      .toBe("ACTIVE");
    await page.goto("/admin/categories");
    const add = page.locator("form").filter({
      has: page.getByRole("button", { name: "Add category", exact: true }),
    });
    await add.getByLabel("Category ID", { exact: true }).fill(categoryId);
    await add
      .getByLabel("English name", { exact: true })
      .fill("Integration category");
    await add.getByLabel("Myanmar name", { exact: true }).fill("စမ်းသပ်မှု");
    await add
      .getByRole("button", { name: "Add category", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await pool.query("SELECT name_en FROM categories WHERE id=$1", [
              categoryId,
            ])
          ).rows[0]?.name_en,
      )
      .toBe("Integration category");
    expect(
      Number(
        (
          await pool.query(
            "SELECT count(*) FROM audit_logs WHERE actor_id=$1",
            [admin.id],
          )
        ).rows[0].count,
      ),
    ).toBeGreaterThanOrEqual(3);
  } finally {
    await pool.query("DELETE FROM listings WHERE id=$1", [listing.id]);
    await pool.query("DELETE FROM categories WHERE id=$1", [categoryId]);
    await pool.query("DELETE FROM audit_logs WHERE actor_id=$1", [admin.id]);
    await pool.query("DELETE FROM users WHERE id=$1", [admin.id]);
  }
});
