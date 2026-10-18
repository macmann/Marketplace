import { test, expect } from "@playwright/test";

test("header install provides accessible instructions without a native prompt", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Install ZaySine",
    exact: true,
  });
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Install ZaySine" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Add to Home Screen");
  await expect(dialog).toContainText("Open in browser");
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
  await button.click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("native install prompts are used once and a later prompt can be accepted", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Install ZaySine",
    exact: true,
  });
  // Complete hydration before dispatching the browser event fixture.
  await button.click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (const outcome of ["dismissed", "accepted"]) {
    await page.evaluate((outcome) => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(event, {
        prompt: async () => {
          document.documentElement.dataset.promptCalls = String(
            Number(document.documentElement.dataset.promptCalls || 0) + 1,
          );
        },
        userChoice: Promise.resolve({ outcome }),
      });
      window.dispatchEvent(event);
    }, outcome);
    await button.click();
    if (outcome === "dismissed") {
      await expect(button).toBeEnabled();
      await button.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
  }
  await expect(button).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-prompt-calls", "2");
});

test("installed apps hide the install action", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { value: true }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Install ZaySine", exact: true }),
  ).toHaveCount(0);
});
