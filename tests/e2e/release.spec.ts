import { test, expect, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const ids: string[] = [],
  category = "browser-" + randomUUID();
let seller: string,
  buyer: string,
  moderator: string,
  support: string,
  administrator: string,
  listing: string,
  conversation: string,
  field: string;
const tokens: Record<string, string> = {};
async function signedIn(context: BrowserContext, id: string) {
  const base = test.info().project.use.baseURL!;
  await context.addCookies([
    {
      name: "market_session",
      value: tokens[id],
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
test.beforeAll(async () => {
  for (const role of ["USER", "USER", "MODERATOR", "SUPPORT", "ADMIN"]) {
    const {
      rows: [u],
    } = await db.query(
      "INSERT INTO users(name,role,phone_verified) VALUES($1,$2,true) RETURNING id",
      ["Browser " + role, role],
    );
    ids.push(u.id);
    const token = randomBytes(32).toString("hex");
    tokens[u.id] = token;
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [createHash("sha256").update(token).digest("hex"), u.id],
    );
  }
  [seller, buyer, moderator, support, administrator] = ids;
  await db.query(
    "INSERT INTO categories(id,name_en,name_my) VALUES($1,'Browser category','စမ်းသပ်မှု')",
    [category],
  );
  field = (
    await db.query(
      "INSERT INTO category_attributes(category_id,key,name_en,name_my,type) VALUES($1,'release_bool','Delivery included','စမ်းသပ်မှု','BOOLEAN') RETURNING id",
      [category],
    )
  ).rows[0].id;
  listing = (
    await db.query(
      "INSERT INTO listings(seller_id,category_id,location_id,title,description,listing_type,price,condition) VALUES($1,$2,'sanchaung','Browser discovery chair','Browser release test chair description','SALE',1000,'GOOD') RETURNING id",
      [seller, category],
    )
  ).rows[0].id;
  await db.query(
    "INSERT INTO listing_images(listing_id,storage_key,position) VALUES($1,$2,0)",
    [listing, randomUUID() + ".webp"],
  );
  await db.query(
    "INSERT INTO listing_attribute_values(listing_id,attribute_id,value) VALUES($1,$2,'false')",
    [listing, field],
  );
  conversation = (
    await db.query(
      "INSERT INTO conversations(listing_id,buyer_id,seller_id) VALUES($1,$2,$3) RETURNING id",
      [listing, buyer, seller],
    )
  ).rows[0].id;
});
test.afterAll(async () => {
  await db.query("DELETE FROM reports WHERE reporter_id=ANY($1::uuid[])", [
    ids,
  ]);
  await db.query("DELETE FROM audit_logs WHERE actor_id=ANY($1::uuid[])", [
    ids,
  ]);
  await db.query("DELETE FROM conversations WHERE id=$1", [conversation]);
  await db.query("DELETE FROM listings WHERE id=$1", [listing]);
  await db.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
  await db.query("DELETE FROM category_attributes WHERE category_id=$1", [
    category,
  ]);
  await db.query("DELETE FROM categories WHERE id=$1", [category]);
  await db.end();
});
test("category filters preserve false values and private response/security headers", async ({
  page,
}) => {
  await page.goto("/?category=" + category);
  await expect(
    page.getByRole("heading", { name: "Browser discovery chair" }),
  ).toBeVisible();
  await page.getByLabel("Delivery included").selectOption("true");
  await page.getByRole("button", { name: "Find something good" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser discovery chair" }),
  ).toHaveCount(0);
  await page.getByLabel("Delivery included").selectOption("false");
  await page.getByRole("button", { name: "Find something good" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser discovery chair" }),
  ).toBeVisible();
  const response = await page.request.get("/");
  expect(response.headers()["content-security-policy"]).toContain(
    "object-src 'none'",
  );
  expect((await page.request.get("/api/events")).status()).toBe(401);
  expect((await page.request.get("/account/export")).status()).toBe(401);
});
test("messages update another signed-in inbox live; read marks and reported-message access are scoped", async ({
  browser,
}) => {
  const sellerContext = await browser.newContext(),
    buyerContext = await browser.newContext();
  try {
    await signedIn(sellerContext, seller);
    await signedIn(buyerContext, buyer);
    const s = await sellerContext.newPage(),
      b = await buyerContext.newPage();
    await s.goto("/account/notifications");
    const stream = await s.evaluate(async () => {
      const abort = new AbortController();
      const r = await fetch("/api/events", { signal: abort.signal });
      const reader = r.body!.getReader();
      const chunk = await reader.read();
      abort.abort();
      return {
        type: r.headers.get("content-type"),
        text: new TextDecoder().decode(chunk.value),
      };
    });
    expect(stream.type).toContain("text/event-stream");
    expect(stream.text).toContain("unread");
    expect(stream.text).not.toContain("body");
    await b.goto("/account/messages/" + conversation);
    await b.getByLabel("Your message").fill("Live message release fixture");
    await b.getByRole("button", { name: "Send message" }).click();
    await expect(
      s.locator(".panel").filter({ hasText: "New message" }),
    ).toBeVisible({ timeout: 15000 });
    await s.getByRole("button", { name: "Mark all as read" }).click();
    expect(
      (
        await db.query(
          "SELECT count(*) FROM notifications WHERE user_id=$1 AND read_at IS NULL",
          [seller],
        )
      ).rows[0].count,
    ).toBe("0");
    await s.goto("/account/messages/" + conversation);
    await expect(
      s.getByText("Live message release fixture", { exact: true }),
    ).toBeVisible();
    await s.getByText("Report message", { exact: true }).click();
    const form = s
      .locator("details")
      .filter({ has: s.getByText("Report message", { exact: true }) });
    await form
      .getByRole("combobox", { name: "Reason", exact: true })
      .selectOption("Harassment");
    await form.getByRole("button", { name: "Submit report" }).click();
    await expect(s).toHaveURL(/reported=1/);
    expect(
      (
        await db.query(
          "SELECT count(*) FROM reports WHERE reporter_id=$1 AND message_id IS NOT NULL",
          [seller],
        )
      ).rows[0].count,
    ).toBe("1");
  } finally {
    await sellerContext.close();
    await buyerContext.close();
  }
});
test("support cannot configure or moderate; moderators can review private queued listings with audit reasons", async ({
  browser,
}) => {
  await db.query(
    "UPDATE listings SET status='PENDING_REVIEW',moderation_reasons='[\"Manual review\"]' WHERE id=$1",
    [listing],
  );
  const ordinary = await browser.newContext();
  const pub = await ordinary.newPage();
  expect((await pub.goto("/listing/" + listing))?.status()).toBe(404);
  await ordinary.close();
  const supportContext = await browser.newContext(),
    modContext = await browser.newContext();
  try {
    await signedIn(supportContext, support);
    const sp = await supportContext.newPage();
    await sp.goto("/admin");
    await expect(
      sp.getByRole("heading", { name: "Reports", exact: true }),
    ).toBeVisible();
    await expect(
      sp.getByRole("heading", { name: "Listings", exact: true }),
    ).toHaveCount(0);
    await sp.goto("/admin/safety");
    await expect(sp).toHaveURL(/\/$/);
    await signedIn(modContext, moderator);
    const m = await modContext.newPage();
    await m.goto("/admin");
    const row = m
      .locator(".admin-row")
      .filter({ hasText: "Browser discovery chair" });
    await row
      .getByLabel("Decision reason")
      .fill("Reviewed listing complies with marketplace policy");
    await row.getByRole("button", { name: "Approve", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await db.query("SELECT status FROM listings WHERE id=$1", [listing]))
            .rows[0].status,
      )
      .toBe("ACTIVE");
    expect(
      (
        await db.query(
          "SELECT detail FROM audit_logs WHERE entity_id=$1 AND action='APPROVE'",
          [listing],
        )
      ).rows[0].detail,
    ).toContain("complies");
  } finally {
    await supportContext.close();
    await modContext.close();
  }
});
test("administrators manage staff roles, revoke changed sessions and protect the last administrator", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    await signedIn(context, administrator);
    const page = await context.newPage();
    await page.goto("/admin/safety");
    const adminForm = page
      .locator("form")
      .filter({ has: page.getByText("Browser ADMIN", { exact: true }) });
    const count = (
      await db.query(
        "SELECT count(*) FROM users WHERE role='ADMIN' AND NOT suspended AND deleted_at IS NULL",
      )
    ).rows[0].count;
    if (count === "1") {
      await adminForm
        .getByRole("combobox", { name: "Role", exact: true })
        .selectOption("USER");
      await adminForm.getByRole("button", { name: "Update role" }).click();
      await expect(page.locator(".notice.error")).toContainText(
        "last administrator",
      );
      expect(
        (await db.query("SELECT role FROM users WHERE id=$1", [administrator]))
          .rows[0].role,
      ).toBe("ADMIN");
    }
    const supportForm = page
      .locator("form")
      .filter({ has: page.getByText("Browser SUPPORT", { exact: true }) });
    await supportForm
      .getByRole("combobox", { name: "Role", exact: true })
      .selectOption("MODERATOR");
    await supportForm.getByRole("button", { name: "Update role" }).click();
    await expect
      .poll(
        async () =>
          (await db.query("SELECT role FROM users WHERE id=$1", [support]))
            .rows[0].role,
      )
      .toBe("MODERATOR");
    expect(
      (
        await db.query("SELECT count(*) FROM sessions WHERE user_id=$1", [
          support,
        ])
      ).rows[0].count,
    ).toBe("0");
    expect(
      (
        await db.query(
          "SELECT count(*) FROM audit_logs WHERE actor_id=$1 AND entity_id=$2 AND action='ROLE_CHANGED'",
          [administrator, support],
        )
      ).rows[0].count,
    ).toBe("1");
  } finally {
    await context.close();
  }
});
test("PWA installs a static-only shell and shows an offline fallback without caching accounts", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.goto("/login");
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return Promise.all(
      keys
        .filter((k) => k.startsWith("neighbour-shell-"))
        .map(async (k) =>
          (await (await caches.open(k)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
    );
  });
  expect(cached.flat()).toContain("/offline.html");
  expect(
    cached.flat().some((p) => p.startsWith("/account") || p === "/login"),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto("/account/settings");
  await expect(
    page.getByRole("heading", { name: "You are offline", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
