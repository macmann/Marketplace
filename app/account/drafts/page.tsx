import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { listingCopy } from "@/lib/listing-i18n";
import { AccountNav, Notice, Pagination } from "../../components";
import { discardDraft } from "../../sell/actions";
export default async function Drafts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [u, a, p] = await Promise.all([
    requireUser(),
    listingCopy(),
    searchParams,
  ]);
  const page = Math.max(1, Math.min(10000, Math.floor(Number(p.page)) || 1));
  const ds = await query(
    "SELECT d.*,(SELECT storage_key FROM listing_images WHERE draft_id=d.id ORDER BY position LIMIT 1) image FROM listing_drafts d WHERE seller_id=$1 ORDER BY updated_at DESC,id LIMIT 25 OFFSET $2",
    [u.id, (page - 1) * 24],
  );
  return (
    <section className="wrap page">
      <h1>{a.drafts}</h1>
      <AccountNav />
      <Notice error={p.error} message={p.discarded ? a.discarded : undefined} />
      <Link className="button primary" href="/sell">
        ＋ {a.create}
      </Link>
      <div className="draft-grid">
        {ds.slice(0, 24).map((d) => (
          <section className="panel draft-card" key={d.id}>
            {d.image && (
              <img
                src={"/media/" + d.image}
                alt={d.payload.title || a.untitled}
                width={300}
                height={180}
              />
            )}
            <h2>{d.payload.title || a.untitled}</h2>
            <Link className="button primary" href={"/sell/draft/" + d.id}>
              {a.resume}
            </Link>
            <details>
              <summary>{a.discard}</summary>
              <p>{a.discardDescription}</p>
              <form action={discardDraft}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="revision" value={d.revision} />
                <button className="button danger">{a.discardConfirm}</button>
              </form>
            </details>
          </section>
        ))}
      </div>
      <Pagination path="/account/drafts" filters={p} hasMore={ds.length > 24} />
    </section>
  );
}
