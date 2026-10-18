import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
let owner: string;
const title = "ရောင်းမည်ကုလားထိုင် " + randomUUID();
test.beforeAll(async () => {
  owner = (
    await db.query(
      "INSERT INTO users(name,phone_verified) VALUES('Myanmar discovery fixture',true) RETURNING id",
    )
  ).rows[0].id;
  await db.query(
    "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition,search_title,search_text) VALUES($1,'home','sanchaung',$2,'သစ်သားထိုင်ခုံ အိမ်သုံးပစ္စည်း ရောင်းရန်','SALE',25000,'GOOD',$2,$2)",
    [owner, title],
  );
});
test.afterAll(async () => {
  await db.query("DELETE FROM listings WHERE seller_id=$1", [owner]);
  await db.query("DELETE FROM users WHERE id=$1", [owner]);
  await db.end();
});
test("Myanmar words without spaces, regional ancestry and approximate nearest discovery", async ({
  page,
}) => {
  await page.goto("/?q=" + encodeURIComponent("ကုလားထိုင်"));
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page
    .getByLabel("State / region", { exact: true })
    .selectOption("yangon-region");
  await page.getByRole("button", { name: "Find something good" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page).toHaveURL(/location=yangon-region/);
  await page.getByLabel("Search townships", { exact: true }).fill("Sanchaung");
  await expect(
    page.locator('select[name="location"] option[value="sanchaung"]'),
  ).toHaveCount(1);
  await page.locator('select[name="location"]').selectOption("sanchaung");
  await page.locator(".extra-filters > summary").click();
  await page.locator('select[name="sort"]').selectOption("near");
  await page.getByRole("button", { name: "Find something good" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
test("Burmese locale persists across discovery and authentication pages", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "locale", value: "my", url: test.info().project.use.baseURL! },
  ]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "my");
  await expect(
    page.getByLabel("တိုင်း/ပြည်နယ်", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('select[name="location"] option[value="sanchaung"]'),
  ).toContainText("စမ်းချောင်း");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "my");
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toHaveCount(0);
  await page.goto("/page-that-does-not-exist");
  await expect(page.getByRole("heading")).not.toHaveText(
    "We couldn’t find that page.",
  );
});
