import Link from "next/link";
import { register } from "../actions";
import { translations } from "@/lib/i18n";
import { Notice } from "../components";
export default async function Register({
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
        <span className="auth-art">♧</span>
      </div>
      <div className="auth-form">
        <h1>{t.registerTitle}</h1>
        <Notice error={p.error} />
        <form action={register} className="stack">
          <label>
            {t.name}
            <input
              name="name"
              autoComplete="nickname"
              minLength={2}
              maxLength={80}
              required
            />
          </label>
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
              aria-label={t.password}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
            <small>{t.passwordHint}</small>
          </label>
          <button className="button primary">{t.register} →</button>
        </form>
        <p>
          <Link href="/login">{t.login} ↗</Link>
        </p>
      </div>
    </section>
  );
}
