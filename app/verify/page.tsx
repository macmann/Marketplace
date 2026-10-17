import { requireUser } from "@/lib/auth";
import { translations } from "@/lib/i18n";
import { confirmOtp, requestOtp } from "../actions";
import { Notice } from "../components";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const [u, t, p] = await Promise.all([
    requireUser(),
    translations(),
    searchParams,
  ]);
  const configured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
  return (
    <section className="wrap page narrow">
      <h1>{t.verify}</h1>
      <p>{t.needsPhone}</p>
      <Notice error={p.error} />
      {!configured && <Notice message={t.phoneUnavailable} />}
      <form action={requestOtp} className="stack panel">
        <label>
          {t.phone}
          <input
            name="phone"
            type="tel"
            placeholder="+959…"
            autoComplete="tel"
            required
            pattern="\+959[0-9]{7,10}"
          />
        </label>
        <button disabled={!configured} className="button primary">
          {t.sendCode}
        </button>
      </form>
      {p.sent && (
        <form action={confirmOtp} className="stack panel">
          <label>
            {t.code}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{4,10}"
              required
            />
          </label>
          <button className="button primary">{t.confirm}</button>
        </form>
      )}
      {u.phone_verified && <p>✓ {t.verified}</p>}
    </section>
  );
}
