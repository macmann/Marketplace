"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, digest } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { emails, emailCookies, emailAddress } from "@/lib/email-service";
import { emailCopy } from "@/lib/email-i18n";
import { accountCopy } from "@/lib/account-i18n";
import { emailLimits } from "@/lib/email-limits";
import { AccountError } from "@/lib/account-service";
const field = (f: FormData, k: string) => String(f.get(k) ?? "");
async function fail(error: unknown): Promise<never> {
  const a = await accountCopy();
  redirect(
    "/verify?error=" +
      encodeURIComponent(
        error instanceof AccountError && error.code === "invalid"
          ? a.invalid
          : error instanceof AccountError && error.code === "notAllowed"
            ? (await emailCopy()).invalidEmail
            : error instanceof AccountError && error.code === "password"
              ? (await emailCopy()).recent
              : a.unavailable,
      ),
  );
}
export async function requestEmailVerification(f: FormData) {
  const u = await requireUser(),
    e = await emailCopy();
  const email = field(f, "email").trim();
  if (!emailAddress.safeParse(email).success)
    redirect("/verify?error=" + encodeURIComponent(e.invalidEmail));
  if (!emailConfigured())
    redirect("/verify?error=" + encodeURIComponent(e.unavailable));
  await emailLimits(email.toLowerCase(), "/verify");
  await emailLimits("user:" + u.id, "/verify");
  let token: string;
  try {
    token = await emails.beginVerify(u.id, email, {
      sessionHash: digest((await cookies()).get("market_session")?.value ?? ""),
      password: field(f, "password"),
    });
  } catch (error) {
    await fail(error);
  }
  (await cookies()).set(emailCookies.VERIFY, token!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: 600,
  });
  redirect("/verify?emailSent=1");
}
export async function confirmEmailVerification(f: FormData) {
  const u = await requireUser(),
    c = await cookies(),
    token = c.get(emailCookies.VERIFY)?.value ?? "";
  await emailLimits(token, "/verify", true);
  try {
    await emails.complete(token, "VERIFY", field(f, "code"), { userId: u.id });
  } catch (error) {
    await fail(error);
  }
  c.delete(emailCookies.VERIFY);
  redirect("/sell");
}
