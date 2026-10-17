import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { accountCopy } from "@/lib/account-i18n";
import { AccountNav, Notice } from "../../components";
import { revokeOtherSessions, deleteAccount } from "../actions";
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sessions?: string }>;
}) {
  const [u, a, p] = await Promise.all([
    requireUser(),
    accountCopy(),
    searchParams,
  ]);
  return (
    <section className="wrap page narrow">
      <h1>{a.settings}</h1>
      <AccountNav />
      {u.phone && (
        <p>
          {a.phone}: {u.phone}
        </p>
      )}
      <Notice
        error={p.error}
        message={p.sessions ? a.sessionsDone : undefined}
      />
      {!u.phone_verified && (
        <div className="notice">
          <p>{a.verifyFirst}</p>
          <Link href="/verify">{a.verifyTitle} →</Link>
        </div>
      )}
      <section className="panel stack">
        <h2>{a.sessions}</h2>
        <p>{a.sessionsHelp}</p>
        <form action={revokeOtherSessions}>
          <button className="button secondary">{a.sessions}</button>
        </form>
        <Link href="/recover">{a.recover} →</Link>
      </section>
      <section className="panel stack">
        <h2>{a.export}</h2>
        <p>{a.exportHelp}</p>
        <a href="/account/export" className="button secondary">
          {a.export}
        </a>
      </section>
      <section className="panel danger-zone">
        <h2>{a.deleteTitle}</h2>
        <p>{a.deleteHelp}</p>
        <form action={deleteAccount} className="stack">
          <label>
            {a.password}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={72}
            />
          </label>
          <label>
            {a.deleteConfirmation}
            <input
              name="confirmation"
              autoComplete="off"
              required
              pattern="DELETE"
            />
          </label>
          <button className="button danger">{a.deleteButton}</button>
        </form>
      </section>
    </section>
  );
}
