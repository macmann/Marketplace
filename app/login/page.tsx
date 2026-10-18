import { uiCopy } from "@/lib/ui-i18n";
import { cookies } from "next/headers";
import { challengeCookie } from "@/lib/account-validation";
import Link from "next/link";
import { login } from "../actions";
import { requestPhoneLogin, confirmPhoneLogin } from "../account/actions";
import { translations } from "@/lib/i18n";
import { accountCopy } from "@/lib/account-i18n";
import { smsConfigured } from "@/lib/sms";
import { Notice } from "../components";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    reset?: string;
    deleted?: string;
  }>;
}) {
  const ui = await uiCopy();

  const [t, a, p] = await Promise.all([
    translations(),
    accountCopy(),
    searchParams,
  ]);
  const enabled = smsConfigured();
  const pending = (await cookies()).has(challengeCookie.LOGIN);
  return (
    <section className="auth-shell">
      <div className="auth-aside">
        <span className="eyebrow">{ui("NEIGHBOUR · MYANMAR")}</span>
        <h1>{t.tagline}</h1>
        <p>{t.about}</p>
        <span className="auth-art">↻</span>
      </div>
      <div className="auth-form">
        <h1>{a.phoneLogin}</h1>
        <p>{a.phoneLoginHelp}</p>
        <Notice
          error={p.error}
          message={p.reset ? a.resetDone : p.deleted ? a.deleted : undefined}
        />
        {!enabled && <Notice message={a.smsUnavailable} />}
        <form action={requestPhoneLogin} className="stack">
          <label>
            {a.phone}
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="09…"
              aria-label={a.phone}
              required
              maxLength={30}
            />
            <small>{a.phoneHint}</small>
          </label>
          <label>
            {a.displayName}
            <input
              name="name"
              autoComplete="nickname"
              minLength={2}
              maxLength={80}
            />
          </label>
          <button disabled={!enabled} className="button primary">
            {a.sendCode}
          </button>
        </form>
        {pending && (
          <form action={confirmPhoneLogin} className="stack otp-form">
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
            <button className="button primary">{a.confirmLogin}</button>
          </form>
        )}
        <p className="muted">{a.privacy}</p>
        <h2 className="auth-divider">{a.emailLogin}</h2>
        <form action={login} className="stack">
          <label>
            {t.email}
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            {t.password}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={72}
              required
            />
          </label>
          <button className="button secondary">{t.login} →</button>
        </form>
        <p>
          <Link href="/recover">{a.recover}</Link>
        </p>
        <p>
          <Link href="/register">{t.register} →</Link>
        </p>
      </div>
    </section>
  );
}
