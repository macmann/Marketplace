import { emailCopy } from "@/lib/email-i18n";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { translations } from "@/lib/i18n";
import { AccountNav } from "../components";
import { updateProfile, blockUser } from "../actions";
import { query } from "@/lib/db";
export default async function Account() {
  const [u, t] = await Promise.all([requireUser(), translations()]);
  const e = await emailCopy();
  const blocks = await query(
    "SELECT u.id,u.name FROM blocks b JOIN users u ON u.id=b.blocked_id WHERE b.user_id=$1",
    [u.id],
  );
  return (
    <section className="wrap page">
      <h1>{t.accountTitle}</h1>
      <AccountNav />
      <div className="two-columns">
        <form action={updateProfile} className="panel stack">
          <h2>{t.profile}</h2>
          <label>
            {t.name}
            <input
              name="name"
              defaultValue={u.name}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <p>{u.email}</p>
          <p>
            {u.phone_verified
              ? "✓ " + t.verified
              : u.email_verified
                ? "✓ " + e.verified
                : e.contactHelp}
          </p>
          {!u.phone_verified && !u.email_verified && (
            <Link href="/verify">{e.contactTitle} →</Link>
          )}
          <button className="button primary">{t.editProfile}</button>
        </form>
        <div className="panel stack">
          <h2>{t.myListings}</h2>
          <Link className="button primary" href="/sell">
            ＋ {t.sell}
          </Link>
          <Link href="/account/listings">{t.myListings} →</Link>
          {["ADMIN", "MODERATOR", "SUPPORT"].includes(u.role) && (
            <Link href="/admin">{t.admin} →</Link>
          )}
          {blocks.map((b) => (
            <form action={blockUser} key={b.id}>
              {b.name}
              <input type="hidden" name="user" value={b.id} />
              <input type="hidden" name="remove" value="true" />
              <button className="text-button">{t.unblock}</button>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}
