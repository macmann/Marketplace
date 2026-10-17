import Link from "next/link";
import { accountCopy } from "@/lib/account-i18n";
import { Listing, options } from "@/lib/marketplace";
import { money, locale, translations, conditionLabels } from "@/lib/i18n";
export async function ListingCard({ listing: l }: { listing: Listing }) {
  const [t, lang] = await Promise.all([translations(), locale()]);
  return (
    <Link className="listing-card" href={"/listing/" + l.id}>
      <div className="card-image">
        {l.image ? (
          <img
            src={"/media/" + l.image}
            alt={l.title}
            loading="lazy"
            width="500"
            height="400"
          />
        ) : (
          <span className="placeholder">↗</span>
        )}
        <span className={"badge " + (l.listing_type === "FREE" ? "green" : "")}>
          {l.listing_type === "FREE"
            ? t.freeLabel
            : conditionLabels[l.condition as keyof typeof conditionLabels]?.[
                lang === "my" ? 1 : 0
              ]}
        </span>
        {l.status !== "ACTIVE" && (
          <span className="status-badge">{l.status}</span>
        )}
      </div>
      <div className="card-content">
        <p className="card-location">
          ⌖ {lang === "my" ? l.location_my : l.location_en}
        </p>
        <h3>{l.title}</h3>
        <strong className="card-price">
          {l.listing_type === "FREE" ? t.freeLabel : money(l.price)}
        </strong>
        <p className="card-meta">
          {lang === "my" ? l.category_my : l.category_en}
          <span>↗</span>
        </p>
      </div>
    </Link>
  );
}
export async function Filters({
  filters,
  free = false,
}: {
  filters: Record<string, string | undefined>;
  free?: boolean;
}) {
  const [{ categories, locations }, t, lang] = await Promise.all([
    options(),
    translations(),
    locale(),
  ]);
  return (
    <form className="filters" action={free ? "/free" : "/"}>
      <div className="search-field">
        <span>⌕</span>
        <input
          name="q"
          aria-label={t.search}
          defaultValue={filters.q}
          placeholder={t.search}
        />
      </div>
      <select
        name="category"
        aria-label={t.category}
        defaultValue={filters.category}
      >
        <option value="">{t.allCategories}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {lang === "my" ? c.name_my : c.name_en}
          </option>
        ))}
      </select>
      <select
        name="location"
        aria-label={t.location}
        defaultValue={filters.location}
      >
        <option value="">{t.allLocations}</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {lang === "my" ? l.name_my : l.name_en}
          </option>
        ))}
      </select>
      <button className="button primary">{t.find} ↗</button>
      <details className="extra-filters">
        <summary>
          {t.sort} &amp; {t.price} ＋
        </summary>
        <div className="filter-row">
          <input
            type="number"
            min="0"
            name="min"
            placeholder={t.min}
            aria-label={t.min}
            defaultValue={filters.min}
          />
          <input
            type="number"
            min="0"
            name="max"
            placeholder={t.max}
            aria-label={t.max}
            defaultValue={filters.max}
          />
          <select name="sort" defaultValue={filters.sort} aria-label={t.sort}>
            <option value="newest">{t.newest}</option>
            <option value="low">{t.low}</option>
            <option value="high">{t.high}</option>
          </select>
          <select
            name="condition"
            defaultValue={filters.condition}
            aria-label={t.condition}
          >
            <option value="">{t.condition}</option>
            {Object.entries(conditionLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang === "my" ? 1 : 0]}
              </option>
            ))}
          </select>
          {!free && (
            <select
              name="type"
              defaultValue={filters.type}
              aria-label={t.listingType}
            >
              <option value="">{t.allTypes}</option>
              <option value="SALE">{t.sale}</option>
              <option value="FREE">{t.freeLabel}</option>
            </select>
          )}
        </div>
      </details>
    </form>
  );
}
export async function Empty({
  title,
  body,
}: {
  title?: string;
  body?: string;
}) {
  const t = await translations();
  return (
    <div className="empty">
      <span className="empty-icon">♧</span>
      <h2>{title ?? t.empty}</h2>
      <p>{body ?? t.emptyBody}</p>
      <Link className="button primary" href="/sell">
        ＋ {t.sell}
      </Link>
    </div>
  );
}
export function Notice({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return error ? (
    <p role="alert" className="notice error">
      {error.slice(0, 250)}
    </p>
  ) : message ? (
    <p role="status" className="notice">
      {message}
    </p>
  ) : null;
}
export async function AccountNav() {
  const t = await translations();
  const a = await accountCopy();
  return (
    <nav className="account-nav">
      <Link href="/account">{t.profile}</Link>
      <Link href="/account/listings">{t.myListings}</Link>
      <Link href="/account/favorites">{t.favorites}</Link>
      <Link href="/account/messages">{t.messages}</Link>
      <Link href="/account/settings">{a.settings}</Link>
    </nav>
  );
}
export async function Pagination({
  filters,
  path,
  hasMore,
}: {
  filters: Record<string, string | undefined>;
  path: string;
  hasMore: boolean;
}) {
  const t = await translations();
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(filters.page)) || 1),
  );
  const url = (n: number) =>
    path +
    "?" +
    new URLSearchParams({
      ...(Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined),
      ) as Record<string, string>),
      page: String(n),
    });
  return (
    <div className="pagination">
      {page > 1 && (
        <Link className="button secondary" href={url(page - 1)}>
          ← {t.previousPage}
        </Link>
      )}
      {hasMore && page < 10000 && (
        <Link className="button secondary" href={url(page + 1)}>
          {t.nextPage} →
        </Link>
      )}
    </div>
  );
}
