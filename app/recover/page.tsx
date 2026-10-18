import { emailConfigured } from "@/lib/email";
import { emailCookies } from "@/lib/email-service";
import { emailCopy } from "@/lib/email-i18n";
import { cookies } from "next/headers";
import { challengeCookie } from "@/lib/account-validation";
import Link from "next/link";
import { accountCopy } from "@/lib/account-i18n";
import { smsConfigured } from "@/lib/sms";
import { requestRecovery, resetPassword } from "../account/actions";
import { Notice } from "../components";
export default async function Recover({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; channel?: string }>;
}) {
  const [a, p] = await Promise.all([accountCopy(), searchParams]);
  const e = await emailCopy();
  const smsEnabled = smsConfigured(),
    emailEnabled = emailConfigured(),
    enabled = smsEnabled || emailEnabled;
  const c = await cookies();
  const pending = c.has(challengeCookie.RECOVER) || c.has(emailCookies.RECOVER);
  return (
    <section className="wrap page narrow">
      <h1>{a.recoveryTitle}</h1>
      <p>{e.recoveryHelp}</p>
      <Notice error={p.error} />
      {!enabled && <Notice message={e.none} />}
      <form action={requestRecovery} className="panel stack">
        <label>
          {e.recoveryChannel}
          <select
            name="channel"
            aria-label={e.recoveryChannel}
            defaultValue={
              p.channel === "EMAIL" && emailEnabled
                ? "EMAIL"
                : smsEnabled
                  ? "SMS"
                  : "EMAIL"
            }
          >
            {smsEnabled && <option value="SMS">{e.sms}</option>}
            {emailEnabled && <option value="EMAIL">{e.emailChannel}</option>}
          </select>
        </label>
        <label>
          {a.identifier}
          <input
            name="identifier"
            autoComplete="username"
            maxLength={254}
            required
          />
        </label>
        <button className="button primary" disabled={!enabled}>
          {a.sendCode}
        </button>
      </form>
      {pending && (
        <>
          <Notice message={e.recoverySent} />
          <form action={resetPassword} className="panel stack">
            <label>
              {a.code}
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4,10}"
                required
              />
            </label>
            <label>
              {a.newPassword}
              <input
                aria-label={a.newPassword}
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
              />
              <small>{a.passwordHelp}</small>
            </label>
            <label>
              {a.confirmPassword}
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
              />
            </label>
            <button className="button primary">{a.resetPassword}</button>
          </form>
        </>
      )}
      <Link href="/login">← {a.backLogin}</Link>
    </section>
  );
}
