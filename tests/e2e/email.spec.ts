import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { emailCodeHash, emailCookies } from "../../lib/email-service";
import { deleteImage } from "../../lib/storage";
import { waitForPublication } from "../helpers/publication";
const db = new Pool({ connectionString: process.env.DATABASE_URL }),
  email = "email-browser-" + randomUUID() + "@example.test";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
let owner: string;
test.beforeAll(async () => {
  owner = (
    await db.query(
      "INSERT INTO users(name,email) VALUES('Email-only giver',$1) RETURNING id",
      [email],
    )
  ).rows[0].id;
});
test.afterAll(async () => {
  const images = (
    await db.query(
      "SELECT storage_key FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE seller_id=$1)",
      [owner],
    )
  ).rows;
  await db.query("DELETE FROM listings WHERE seller_id=$1", [owner]);
  await db.query("DELETE FROM users WHERE id=$1", [owner]);
  await Promise.all(images.map((i) => deleteImage(i.storage_key)));
  await db.end();
});
test("email-only verification enables a free giveaway and email recovery establishes a password without SMS", async ({
  page,
  context,
  browser,
}) => {
  // Explicit test-database challenge fixtures; the production sender has no bypass.
  const token = randomBytes(32).toString("hex"),
    session = randomBytes(32).toString("hex"),
    code = "483729";
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [digest(session), owner],
  );
  await db.query(
    "INSERT INTO email_challenges(token_hash,code_hash,purpose,user_id,email) VALUES($1,$2,'VERIFY',$3,$4)",
    [digest(token), emailCodeHash(token, code), owner, email],
  );
  await context.addCookies([
    {
      name: "market_session",
      value: session,
      url: test.info().project.use.baseURL!,
      httpOnly: true,
    },
    {
      name: emailCookies.VERIFY,
      value: token,
      url: test.info().project.use.baseURL!,
      httpOnly: true,
    },
  ]);
  await page.goto("/verify");
  await page.getByLabel("Email verification code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/sell$/);
  const proof = (
    await db.query(
      "SELECT phone_verified,email_verified FROM users WHERE id=$1",
      [owner],
    )
  ).rows[0];
  expect(proof.email_verified).toBe(true);
  expect(proof.phone_verified).toBe(false);
  const title = "Email-only free chair " + randomUUID();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A free chair for a neighbour to collect locally.");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("home");
  await page
    .getByRole("combobox", { name: "Location", exact: true })
    .selectOption("sanchaung");
  await page.locator('input[name="type"][value="FREE"]').check();
  const image = await sharp({
    create: { width: 180, height: 200, channels: 3, background: "#4f8ac2" },
  })
    .jpeg()
    .toBuffer();
  await page.getByLabel("Photos (1–10)").setInputFiles({
    name: "chair.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await page
    .getByRole("button", { name: "Publish listing", exact: false })
    .click();
  const id = await waitForPublication(page, db, owner, title);
  await expect(
    page.getByText("✓ Email verified", { exact: true }),
  ).toBeVisible();
  const anonymous = await browser.newContext();
  try {
    const response = await anonymous.request.get("/listing/" + id);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain(email);
  } finally {
    await anonymous.close();
  }
  const recovery = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO email_challenges(token_hash,code_hash,purpose,user_id,email) VALUES($1,$2,'RECOVER',$3,$4)",
    [digest(recovery), emailCodeHash(recovery, code), owner, email],
  );
  await context.clearCookies();
  await context.addCookies([
    {
      name: emailCookies.RECOVER,
      value: recovery,
      url: test.info().project.use.baseURL!,
      httpOnly: true,
    },
  ]);
  await page.goto("/recover");
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-email-password-123");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("new-email-password-123");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?reset=1$/);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("new-email-password-123");
  await page.getByRole("button", { name: "Log in", exact: false }).click();
  await expect(page).toHaveURL(/\/account$/);
});
