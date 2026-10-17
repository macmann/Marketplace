import { catalog } from "@/lib/marketplace";
import { translations } from "@/lib/i18n";
import { ListingCard, Filters, Empty, Pagination } from "../components";
export default async function Free({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const f = { ...(await searchParams), type: "FREE" };
  const [t, ls] = await Promise.all([translations(), catalog(f)]);
  return (
    <section className="wrap page">
      <span className="eyebrow">↻ PASS IT ON</span>
      <h1>{t.free}</h1>
      <Filters filters={f} free />
      {ls.length ? (
        <div className="listing-grid">
          {ls.slice(0, 24).map((l) => (
            <ListingCard listing={l} key={l.id} />
          ))}
        </div>
      ) : (
        <Empty />
      )}
      <Pagination filters={f} path="/free" hasMore={ls.length > 24} />
    </section>
  );
}
