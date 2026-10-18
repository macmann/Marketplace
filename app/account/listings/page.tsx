import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import StatusFields from "./status-fields";
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
  const ui = await uiCopy();
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
      {ls.some((l) => l.automation_state === "PENDING") && (
        <p role="status" className="notice">
          {ui(
            "Photos are processing. Your listing stays private until checks finish.",
          )}
        </p>
      )}
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
              <ListingCard
                listing={l}
                href={
                  ["PENDING_REVIEW", "REJECTED", "DRAFT"].includes(l.status)
                    ? "/sell/" + l.id
                    : undefined
                }
              />
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
                <StatusFields
                  id={l.id}
                  options={Object.entries(states).filter(([key]) =>
                    canTransition(l.status, key),
                  )}
                  statusLabel={t.status}
                  updateLabel={t.update}
                />
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
