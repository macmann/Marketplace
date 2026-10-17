import Link from "next/link";
import { login } from "../actions";
import { translations } from "@/lib/i18n";
import { Notice } from "../components";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [t, p] = await Promise.all([translations(), searchParams]);
  return (
    <section className="auth-shell">
      <div className="auth-aside">
        <span className="eyebrow">NEIGHBOUR · MYANMAR</span>
        <h1>{t.tagline}</h1>
        <p>{t.about}</p>
        <span className="auth-art">↻</span>
      </div>
      <div className="auth-form">
        <h1>{t.loginTitle}</h1>
        <Notice error={p.error} />
        <form action={login} className="stack">
          <label>
            {t.email}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
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
          <button className="button primary">{t.login} →</button>
        </form>
        <p>
          <Link href="/register">{t.register} ↗</Link>
        </p>
      </div>
    </section>
  );
}
