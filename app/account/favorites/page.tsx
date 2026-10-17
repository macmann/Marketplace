import { requireUser } from "@/lib/auth";
import { catalog } from "@/lib/marketplace";
import { translations } from "@/lib/i18n";
import { AccountNav, Empty, ListingCard } from "../../components";
export default async function Favorites() {
  const [u, t] = await Promise.all([requireUser(), translations()]);
  const ls = await catalog({}, undefined, u.id);
  return (
    <section className="wrap page">
      <h1>{t.favorites}</h1>
      <AccountNav />
      {ls.length ? (
        <div className="listing-grid">
          {ls.slice(0, 24).map((l) => (
            <ListingCard listing={l} key={l.id} />
          ))}
        </div>
      ) : (
        <Empty title={t.favorites} body={t.noSaved} />
      )}
    </section>
  );
}
