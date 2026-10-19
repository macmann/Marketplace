import { test, expect } from "@playwright/test";

test("login tabs show one method, retain input and support keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  const email = page.getByRole("tab", { name: "Email", exact: true });
  const sms = page.getByRole("tab", { name: "SMS", exact: true });
  await expect(email).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(
    page.getByLabel("Phone number", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("preferred@example.test");
  await sms.click();
  await expect(sms).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send verification code", exact: true }),
  ).toBeDisabled();
  await sms.press("ArrowLeft");
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toHaveValue("preferred@example.test");
  await email.press("End");
  await expect(sms).toBeFocused();
  await sms.press("Home");
  await expect(email).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("email errors keep email selected even with a pending SMS challenge", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "phone_login_challenge",
      value: "expired-test-challenge",
      url: test.info().project.use.baseURL!,
    },
  ]);
  await page.goto("/login?method=email");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("missing-tabs@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Invalid-password-123");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page).toHaveURL(/method=email/);
  await expect(
    page.getByRole("tab", { name: "Email", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("Email or password is incorrect.", { exact: true }),
  ).toBeVisible();
});

test("pending SMS errors stay on the SMS tab and Myanmar labels are available", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "phone_login_challenge",
      value: "expired-test-challenge",
      url: test.info().project.use.baseURL!,
    },
  ]);
  await page.goto("/login?sent=1");
  await expect(
    page.getByRole("tab", { name: "SMS", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page
    .getByRole("button", { name: "Verify and continue", exact: true })
    .click();
  await expect(page).toHaveURL(/method=sms/);
  await expect(
    page.getByRole("tab", { name: "SMS", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await context.addCookies([
    { name: "locale", value: "my", url: test.info().project.use.baseURL! },
  ]);
  await page.goto("/login?method=email");
  await expect(
    page.getByRole("tab", { name: "အီးမေးလ်", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "SMS", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
});
