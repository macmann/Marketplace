import { releaseCopy } from "@/lib/release-i18n";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { translations } from "@/lib/i18n";
import { AccountNav, Notice } from "../../components";
export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reported?: string }>;
}) {
  const [u, t, p] = await Promise.all([
    requireUser(),
    translations(),
    searchParams,
  ]);
  const cs = await query(
    `SELECT c.*,l.title,u.name,(SELECT count(*) FROM messages m WHERE m.conversation_id=c.id AND m.sender_id<>$1 AND m.read_at IS NULL) unread FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN users u ON u.id=CASE WHEN c.buyer_id=$1 THEN c.seller_id ELSE c.buyer_id END WHERE c.buyer_id=$1 OR c.seller_id=$1 ORDER BY (SELECT max(created_at) FROM messages WHERE conversation_id=c.id) DESC NULLS LAST,c.created_at DESC`,
    [u.id],
  );
  return (
    <section className="wrap page narrow">
      <h1>{t.messages}</h1>
      <AccountNav />
      <Notice
        error={p.error}
        message={p.reported ? (await releaseCopy()).reportThanks : undefined}
      />
      {cs.length ? (
        cs.map((c) => (
          <Link
            key={c.id}
            className="conversation panel"
            href={"/account/messages/" + c.id}
          >
            <span className="avatar">{c.name.slice(0, 1)}</span>
            <div>
              <strong>{c.name}</strong>
              <p>{c.title}</p>
            </div>
            {Number(c.unread) > 0 && (
              <span className="badge green">{c.unread}</span>
            )}
            <span>→</span>
          </Link>
        ))
      ) : (
        <div className="empty">
          <h2>{t.noMessages}</h2>
        </div>
      )}
    </section>
  );
}
