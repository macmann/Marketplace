import { emailConfigured } from "@/lib/email";
import { emailCookies } from "@/lib/email-service";
import { emailCopy } from "@/lib/email-i18n";
import {
  requestEmailVerification,
  confirmEmailVerification,
} from "../account/email-actions";
import { cookies } from "next/headers";
import { challengeCookie } from "@/lib/account-validation";
import { requireUser } from "@/lib/auth";
import { accountCopy } from "@/lib/account-i18n";
import { translations } from "@/lib/i18n";
import { smsConfigured } from "@/lib/sms";
import { requestVerification, confirmVerification } from "../account/actions";
import { Notice } from "../components";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const [u, a, t, p] = await Promise.all([
    requireUser(),
    accountCopy(),
    translations(),
    searchParams,
  ]);
  const e = await emailCopy();
  const enabled = smsConfigured();
  const emailEnabled = emailConfigured();
  const emailPending = (await cookies()).has(emailCookies.VERIFY);
  const pending = (await cookies()).has(challengeCookie.VERIFY);
  return (
    <section className="wrap page narrow">
      <h1>{e.contactTitle}</h1>
      <p>{e.contactHelp}</p>
      <Notice error={p.error} />
      {!enabled && <Notice message={a.smsUnavailable} />}
      <form action={requestVerification} className="stack panel">
        <label>
          {a.phone}
          <input
            name="phone"
            type="tel"
            aria-label={a.phone}
            placeholder="09…"
            autoComplete="tel"
            required
            maxLength={30}
          />
          <small>{a.phoneHint}</small>
        </label>
        <button disabled={!enabled} className="button primary">
          {a.sendCode}
        </button>
      </form>
      {pending && (
        <>
          <Notice message={a.verifySent} />
          <form action={confirmVerification} className="stack panel">
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
            <button className="button primary">{a.confirmVerify}</button>
          </form>
        </>
      )}
      {u.phone_verified && <p>✓ {t.verified}</p>}
      <p className="muted">{a.privacy}</p>
      <h2>{e.title}</h2>
      <p>{e.help}</p>
      {u.email_verified && <p>✓ {e.verified}</p>}
      {!emailEnabled && <Notice message={e.unavailable} />}
      <form action={requestEmailVerification} className="stack panel">
        <label>
          {e.email}
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            defaultValue={u.email ?? ""}
            readOnly={!!u.email}
          />
        </label>
        {u.email && <small>{e.changeHelp}</small>}
        {!u.email && (
          <label>
            {e.password}
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              maxLength={72}
            />
          </label>
        )}
        <button className="button primary" disabled={!emailEnabled}>
          {e.send}
        </button>
      </form>
      {emailPending && (
        <>
          <Notice message={e.sent} />
          <form action={confirmEmailVerification} className="stack panel">
            <label>
              {e.code}
              <input
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                required
                maxLength={6}
              />
            </label>
            <button className="button primary">{e.confirm}</button>
          </form>
        </>
      )}
      <p className="muted">{e.privacy}</p>
    </section>
  );
}
