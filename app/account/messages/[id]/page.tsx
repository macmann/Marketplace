import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { translations } from "@/lib/i18n";
import { sendMessage, blockUser } from "../../../actions";
import { Notice } from "../../../components";
import ReportForm from "@/app/report-form";
export default async function Thread({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; before?: string }>;
}) {
  const ui = await uiCopy();

  const [u, t, { id }, p] = await Promise.all([
    requireUser(),
    translations(),
    params,
    searchParams,
  ]);
  if (!uuid.safeParse(id).success) notFound();
  const [c] = await query(
    `SELECT c.*,l.title,u.name,u.suspended FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN users u ON u.id=CASE WHEN c.buyer_id=$1 THEN c.seller_id ELSE c.buyer_id END WHERE c.id=$2 AND (c.buyer_id=$1 OR c.seller_id=$1)`,
    [u.id, id],
  );
  if (!c) notFound();
  const other = c.buyer_id === u.id ? c.seller_id : c.buyer_id;
  const blocked = await query(
    "SELECT * FROM blocks WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1)",
    [u.id, other],
  );
  await query(
    "UPDATE messages SET read_at=now() WHERE conversation_id=$1 AND sender_id<>$2 AND read_at IS NULL",
    [id, u.id],
  );
  await query(
    "UPDATE notifications SET read_at=now() WHERE user_id=$1 AND conversation_id=$2 AND read_at IS NULL",
    [u.id, id],
  );
  const ms = await query(
    "SELECT * FROM (SELECT * FROM messages WHERE conversation_id=$1 AND ($2::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM messages WHERE id=$2 AND conversation_id=$1)) ORDER BY created_at DESC,id DESC LIMIT 51) recent ORDER BY created_at,id",
    [id, uuid.safeParse(p.before).success ? p.before : null],
  );
  return (
    <section className="wrap page narrow">
      <Link href="/account/messages">← {t.messages}</Link>
      <h1>{c.name}</h1>
      <Link className="thread-listing" href={"/listing/" + c.listing_id}>
        {c.title} ↗
      </Link>
      <Notice error={p.error} />
      {ms.length > 50 && (
        <Link href={"/account/messages/" + id + "?before=" + ms[1].id}>
          {ui("← Earlier messages")}
        </Link>
      )}
      <div className="thread" aria-live="polite">
        {ms.slice(-50).map((m) => (
          <div
            key={m.id}
            className={"message " + (m.sender_id === u.id ? "mine" : "")}
          >
            <p>{m.body}</p>
            <small>
              {new Date(m.created_at).toLocaleString()}{" "}
              {m.sender_id === u.id && m.read_at ? "✓✓" : ""}
            </small>
            {m.sender_id !== u.id && <ReportForm kind="message" id={m.id} />}
          </div>
        ))}
      </div>
      {!blocked.length && !c.suspended && (
        <form action={sendMessage} className="message-form">
          <input type="hidden" name="id" value={id} />
          <textarea
            aria-label={t.body}
            name="body"
            maxLength={2000}
            required
            rows={2}
          />
          <button className="button primary">{t.send} →</button>
        </form>
      )}
      <ReportForm kind="user" id={other} />
      <form action={blockUser}>
        <input type="hidden" name="user" value={other} />
        <input
          type="hidden"
          name="remove"
          value={String(blocked.some((b) => b.user_id === u.id))}
        />
        <button className="text-button">
          {blocked.some((b) => b.user_id === u.id) ? t.unblock : t.block}
        </button>
      </form>
    </section>
  );
}
