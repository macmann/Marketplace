import { expect, type Page } from "@playwright/test";
import type { Pool } from "pg";
export async function waitForPublication(
  page: Page,
  db: Pool,
  owner: string,
  title: string,
) {
  let id = "";
  await expect
    .poll(
      async () => {
        const {
          rows: [row],
        } = await db.query(
          "SELECT id,status FROM listings WHERE seller_id=$1 AND title=$2 ORDER BY created_at DESC LIMIT 1",
          [owner, title],
        );
        id = row?.id ?? "";
        return row?.status;
      },
      { timeout: 45000 },
    )
    .toBe("ACTIVE");
  await page.goto("/listing/" + id);
  return id;
}
