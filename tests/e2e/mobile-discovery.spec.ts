import { test, expect } from "@playwright/test";

for (const locale of ["en", "my"]) {
  test(`mobile discovery controls remain readable in ${locale}`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "locale", value: locale, url: test.info().project.use.baseURL! },
    ]);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await expect(page.locator("header .brand")).toContainText("by");
      await expect(
        page.locator("header .brand").getByRole("img", { name: "Flash Tech" }),
      ).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator("header")
            .getByRole("img", { name: "Flash Tech" })
            .evaluateAll(
              (images) =>
                images.length === 1 &&
                images.every((image) => {
                  const img = image as HTMLImageElement;
                  return img.complete && img.naturalWidth > 0;
                }),
            ),
        )
        .toBe(true);
      const category = await page
        .locator('select[name="category"]')
        .boundingBox();
      const region = await page
        .locator(".location-picker select")
        .first()
        .boundingBox();
      expect(category).not.toBeNull();
      expect(region).not.toBeNull();
      // Category must remain a normal control, above the full-width region field.
      expect(category!.height).toBeLessThan(70);
      expect(region!.y).toBeGreaterThanOrEqual(category!.y + category!.height);
      expect(region!.width).toBeGreaterThanOrEqual(category!.width - 2);
      const fits = await page
        .locator(".location-picker select")
        .first()
        .evaluate((select) => {
          const field = select as HTMLSelectElement;
          const style = getComputedStyle(field);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          ctx.font = style.font;
          return (
            ctx.measureText(field.selectedOptions[0].text).width +
              parseFloat(style.paddingLeft) +
              parseFloat(style.paddingRight) +
              24 <=
            field.clientWidth
          );
        });
      expect(fits).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const header = page.locator("header");
      for (const control of [
        header.locator(".brand"),
        header.locator(".language"),
        header.locator('a[href="/sell"]'),
      ]) {
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
    }
  });
}
