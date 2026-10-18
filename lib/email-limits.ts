import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit, digest } from "./auth";
import { accountCopy } from "./account-i18n";
export async function emailLimits(
  identifier: string,
  path: string,
  check = false,
) {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  try {
    await rateLimit("email-ip:" + digest(ip), check ? 30 : 15, 600);
    await rateLimit(
      (check ? "email-check:" : "email-destination:") + digest(identifier),
      check ? 5 : 3,
      600,
    );
  } catch {
    redirect(
      path + "?error=" + encodeURIComponent((await accountCopy()).tooMany),
    );
  }
}
