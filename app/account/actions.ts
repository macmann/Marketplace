"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { accounts, AccountError } from "@/lib/account-service";
import { accountCopy } from "@/lib/account-i18n";
import {
  challengeCookie,
  normalizePhone,
  displayNameSchema,
  passwordSchema,
  type Purpose,
} from "@/lib/account-validation";
import { emailConfigured } from "@/lib/email";
import { emails, emailCookies } from "@/lib/email-service";
import { emailCopy } from "@/lib/email-i18n";
import { emailLimits } from "@/lib/email-limits";
import { smsConfigured } from "@/lib/sms";
import { createSession, requireUser, rateLimit, digest } from "@/lib/auth";
import { query } from "@/lib/db";
const field = (f: FormData, name: string) => String(f.get(name) ?? "");
const pathFor: Record<Purpose, string> = {
  LOGIN: "/login",
  VERIFY: "/verify",
  RECOVER: "/recover",
};
async function fail(path: string, key: string): Promise<never> {
  const t = await accountCopy();
  redirect(
    path +
      "?error=" +
      encodeURIComponent(t[key as keyof typeof t] ?? t.notAllowed),
  );
}
async function limited(
  key: string,
  limit: number,
  seconds: number,
  path: string,
) {
  try {
    await rateLimit(key, limit, seconds);
  } catch {
    await fail(path, "tooMany");
  }
}
async function otpLimits(identifier: string, purpose: Purpose) {
  const path = pathFor[purpose];
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  await limited("sms-ip:" + digest(ip), 15, 600, path);
  await limited("sms-destination:" + digest(identifier), 3, 600, path);
}
async function saveChallenge(purpose: Purpose, token: string) {
  (await cookies()).set(challengeCookie[purpose], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: 600,
  });
}
async function handleError(path: string, error: unknown): Promise<never> {
  return await fail(
    path,
    error instanceof AccountError
      ? error.code === "password"
        ? "passwordError"
        : error.code
      : "notAllowed",
  );
}
export async function requestPhoneLogin(f: FormData) {
  const phone = normalizePhone(field(f, "phone"));
  if (!phone) await fail("/login", "phoneInvalid");
  const name = field(f, "name").trim() || "ZaySine";
  if (!displayNameSchema.safeParse(name).success)
    await fail("/login", "nameInvalid");
  if (!smsConfigured()) await fail("/login", "smsUnavailable");
  await otpLimits(phone!, "LOGIN");
  try {
    await saveChallenge(
      "LOGIN",
      await accounts.begin("LOGIN", { phone: phone!, name }),
    );
  } catch (e) {
    await handleError("/login", e);
  }
  redirect("/login?sent=1");
}
export async function confirmPhoneLogin(f: FormData) {
  const c = await cookies();
  const token = c.get(challengeCookie.LOGIN)?.value ?? "";
  await limited("sms-check:" + digest(token), 5, 600, "/login");
  let id: string;
  try {
    id = await accounts.complete(token, "LOGIN", field(f, "code"));
  } catch (e) {
    await handleError("/login", e);
  }
  c.delete(challengeCookie.LOGIN);
  await createSession(id!);
  redirect("/account");
}
export async function requestVerification(f: FormData) {
  const u = await requireUser();
  const phone = normalizePhone(field(f, "phone"));
  if (!phone) await fail("/verify", "phoneInvalid");
  if (!smsConfigured()) await fail("/verify", "smsUnavailable");
  await limited("sms-user:" + u.id, 3, 600, "/verify");
  await otpLimits(phone!, "VERIFY");
  try {
    await saveChallenge(
      "VERIFY",
      await accounts.begin("VERIFY", { phone: phone!, userId: u.id }),
    );
  } catch (e) {
    await handleError("/verify", e);
  }
  redirect("/verify?sent=1");
}
export async function confirmVerification(f: FormData) {
  const u = await requireUser();
  const c = await cookies();
  const token = c.get(challengeCookie.VERIFY)?.value ?? "";
  await limited("sms-check:" + digest(token), 5, 600, "/verify");
  try {
    await accounts.complete(token, "VERIFY", field(f, "code"), {
      userId: u.id,
    });
  } catch (e) {
    await handleError("/verify", e);
  }
  c.delete(challengeCookie.VERIFY);
  redirect("/sell");
}
export async function requestRecovery(f: FormData) {
  const identifier = field(f, "identifier").trim().toLowerCase().slice(0, 254);
  if (!identifier) await fail("/recover", "notAllowed");
  const channel = field(f, "channel");
  if (channel === "EMAIL") {
    if (!emailConfigured())
      redirect(
        "/recover?error=" + encodeURIComponent((await emailCopy()).unavailable),
      );
    await emailLimits(identifier, "/recover");
    const token = await emails.beginRecovery(identifier);
    const c = await cookies();
    c.set(emailCookies.RECOVER, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE !== "false",
      path: "/",
      maxAge: 600,
    });
    c.delete(challengeCookie.RECOVER);
    redirect("/recover?sent=1&channel=EMAIL");
  }
  if (channel && channel !== "SMS") await fail("/recover", "notAllowed");
  (await cookies()).delete(emailCookies.RECOVER);
  if (!smsConfigured()) await fail("/recover", "smsUnavailable");
  await otpLimits(normalizePhone(identifier) ?? identifier, "RECOVER");
  try {
    await saveChallenge(
      "RECOVER",
      await accounts.begin("RECOVER", { identifier }),
    );
  } catch (e) {
    await handleError("/recover", e);
  }
  redirect("/recover?sent=1");
}
export async function resetPassword(f: FormData) {
  const password = field(f, "password");
  if (
    !passwordSchema.safeParse(password).success ||
    password !== field(f, "confirmPassword")
  )
    await fail("/recover", "passwordInvalid");
  const c = await cookies();
  const emailToken = c.get(emailCookies.RECOVER)?.value;
  if (emailToken) {
    await emailLimits(emailToken, "/recover", true);
    try {
      await emails.complete(emailToken, "RECOVER", field(f, "code"), {
        password,
      });
    } catch (e) {
      await handleError("/recover", e);
    }
    for (const name of [
      emailCookies.RECOVER,
      emailCookies.VERIFY,
      ...Object.values(challengeCookie),
      "market_session",
    ])
      c.delete(name);
    redirect("/login?reset=1");
  }
  const token = c.get(challengeCookie.RECOVER)?.value ?? "";
  await limited("sms-check:" + digest(token), 5, 600, "/recover");
  try {
    await accounts.complete(token, "RECOVER", field(f, "code"), { password });
  } catch (e) {
    await handleError("/recover", e);
  }
  c.delete(challengeCookie.RECOVER);
  c.delete("market_session");
  redirect("/login?reset=1");
}
export async function revokeOtherSessions() {
  const u = await requireUser();
  const token = (await cookies()).get("market_session")?.value ?? "";
  await query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [
    u.id,
    digest(token),
  ]);
  redirect("/account/settings?sessions=1");
}
export async function deleteAccount(f: FormData) {
  const u = await requireUser();
  if (field(f, "confirmation") !== "DELETE")
    await fail("/account/settings", "confirmationInvalid");
  await limited("delete-account:" + u.id, 5, 900, "/account/settings");
  const c = await cookies();
  try {
    await accounts.deleteAccount(
      u.id,
      digest(c.get("market_session")?.value ?? ""),
      field(f, "password"),
    );
  } catch (e) {
    await handleError("/account/settings", e);
  }
  c.delete("market_session");
  for (const name of [
    ...Object.values(challengeCookie),
    ...Object.values(emailCookies),
  ])
    c.delete(name);
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
