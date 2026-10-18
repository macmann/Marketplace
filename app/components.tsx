import LocationPicker from "./location-picker";
import { uiCopy } from "@/lib/ui-i18n";
import { attributeDefinitions } from "@/lib/listing-service";
import { pool } from "@/lib/db";
import { releaseCopy } from "@/lib/release-i18n";
import Link from "next/link";
import { listingCopy } from "@/lib/listing-i18n";
import { accountCopy } from "@/lib/account-i18n";
import { Listing, options } from "@/lib/marketplace";
import { money, locale, translations, conditionLabels } from "@/lib/i18n";
export async function ListingCard({
  listing: l,
  href,
}: {
  listing: Listing;
  href?: string;
}) {
  const ui = await uiCopy();

  const [t, lang] = await Promise.all([translations(), locale()]);
  return (
    <Link className="listing-card" href={href ?? "/listing/" + l.id}>
      <div className="card-image">
        {l.image ? (
          <img
            src={"/media/" + l.image + "?variant=card"}
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
          <span className="status-badge">{ui(l.status)}</span>
        )}
      </div>
      <div className="card-content">
        <p className="card-location">
          ⌖ {lang === "my" ? l.location_my : l.location_en}
        </p>
        <h3>{l.title}</h3>
        <strong className="card-price">
          {l.listing_type === "FREE" ? t.freeLabel : money(l.price, lang)}
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
  const ui = await uiCopy();

  const [{ categories, locations }, t, lang] = await Promise.all([
    options(),
    translations(),
    locale(),
  ]);
  const fields = await attributeDefinitions(pool, filters.category ?? "");
  const r = await releaseCopy();
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
      <LocationPicker
        locations={locations.map((l) => ({
          id: l.id,
          label: lang === "my" ? l.display_my : l.display_en,
          parent_id: l.display_parent,
          kind: l.kind,
          canonical_id: l.canonical_id,
          aliases: l.aliases,
        }))}
        value={filters.location}
        lang={lang}
        label={t.location}
        allLabel={t.allLocations}
      />
      <button className="button primary">{t.find} ↗</button>
      {filters.sort === "near" && (
        <p className="muted">
          {(await uiCopy())(
            "Distances use approximate township centers, not seller addresses.",
          )}
        </p>
      )}
      <details className="extra-filters">
        <summary>
          {t.sort} {"&"}
          {t.price} ＋
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
          <select
            name="sort"
            defaultValue={filters.sort ?? "relevance"}
            aria-label={t.sort}
          >
            <option value="near">
              {(await uiCopy())("Nearest to selected area")}
            </option>
            <option value="relevance">{r.relevance}</option>
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
      {fields.length > 0 && (
        <details className="extra-filters" open>
          <summary>{r.categoryFilters}</summary>
          <div className="filter-row">
            {fields.map((a) => (
              <label key={a.id}>
                {lang === "my" ? a.name_my : a.name_en}
                {a.type === "ENUM" || a.type === "BOOLEAN" ? (
                  <select
                    name={"attr_" + a.id}
                    defaultValue={filters["attr_" + a.id] ?? ""}
                  >
                    <option value="">{r.any}</option>
                    {(a.type === "BOOLEAN" ? ["true", "false"] : a.choices).map(
                      (v) => (
                        <option key={v} value={v}>
                          {a.type === "BOOLEAN"
                            ? v === "true"
                              ? r.yes
                              : r.no
                            : v}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <input
                    name={"attr_" + a.id}
                    type={
                      a.type === "NUMBER"
                        ? "number"
                        : a.type === "DATE"
                          ? "date"
                          : "text"
                    }
                    step="any"
                    maxLength={500}
                    defaultValue={filters["attr_" + a.id]}
                  />
                )}
              </label>
            ))}
          </div>
        </details>
      )}
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
export async function Notice({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const ui = await uiCopy();
  return error ? (
    <p role="alert" className="notice error">
      {ui(error.slice(0, 250))}
    </p>
  ) : message ? (
    <p role="status" className="notice">
      {message}
    </p>
  ) : null;
}
export async function AccountNav() {
  const t = await translations();
  const l = await listingCopy();
  const a = await accountCopy();
  return (
    <nav className="account-nav">
      <Link href="/account">{t.profile}</Link>
      <Link href="/account/listings">{t.myListings}</Link>
      <Link href="/account/drafts">{l.drafts}</Link>
      <Link href="/account/favorites">{t.favorites}</Link>
      <Link href="/account/messages">{t.messages}</Link>
      <Link href="/account/notifications">
        {(await releaseCopy()).notifications}
      </Link>
      <Link href="/account/reports">{(await releaseCopy()).myReports}</Link>
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
