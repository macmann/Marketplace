import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { catalog } from "@/lib/marketplace";
import { translations } from "@/lib/i18n";
import { canTransition } from "@/lib/validation";
import { AccountNav, Empty, ListingCard, Notice } from "../../components";
import { listingStatus } from "../../actions";
export default async function Listings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; review?: string }>;
}) {
  const p = await searchParams;
  const [u, t] = await Promise.all([requireUser(), translations()]);
  const ls = await catalog({}, u.id);
  const states: Record<string, string> = {
    ACTIVE: t.active,
    RESERVED: t.reserved,
    SOLD: t.sold,
    ARCHIVED: t.archived,
    DRAFT: t.draft,
    EXPIRED: t.expired,
    REMOVED: t.removed,
    PENDING_REVIEW: t.pending,
    REJECTED: t.rejected,
  };
  return (
    <section className="wrap page">
      <h1>{t.myListings}</h1>
      <AccountNav />
      <Notice
        error={p.error}
        message={
          p.review
            ? (await import("@/lib/release-i18n").then((m) => m.releaseCopy()))
                .pending
            : undefined
        }
      />
      {ls.length ? (
        <div className="listing-grid">
          {ls.slice(0, 24).map((l) => (
            <div key={l.id}>
              <ListingCard listing={l} />
              <form action={listingStatus} className="status-form">
                <span>{states[l.status]}</span>
                {[
                  "ACTIVE",
                  "RESERVED",
                  "DRAFT",
                  "EXPIRED",
                  "PENDING_REVIEW",
                  "REJECTED",
                ].includes(l.status) && (
                  <Link href={"/sell/" + l.id}>{t.editListing}</Link>
                )}
                <input type="hidden" name="id" value={l.id} />
                <select name="status" aria-label={t.status}>
                  {Object.entries(states)
                    .filter(([key]) => canTransition(l.status, key))
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
                <button
                  className="button secondary compact"
                  disabled={
                    !Object.keys(states).some((k) => canTransition(l.status, k))
                  }
                >
                  {t.update}
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <Empty body={t.noListings} />
      )}
    </section>
  );
}
