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
  const enabled = smsConfigured();
  const pending = (await cookies()).has(challengeCookie.VERIFY);
  return (
    <section className="wrap page narrow">
      <h1>{a.verifyTitle}</h1>
      <p>{a.verifyHelp}</p>
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
    </section>
  );
}
