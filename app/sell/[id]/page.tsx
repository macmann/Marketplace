import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { options } from "@/lib/marketplace";
import { uuid } from "@/lib/validation";
import { translations, locale, conditionLabels } from "@/lib/i18n";
import { editListing } from "../../actions";
import { Notice } from "../../components";
export default async function Edit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [u, t, lang, { id }, p, { categories, locations }] = await Promise.all([
    requireUser(),
    translations(),
    locale(),
    params,
    searchParams,
    options(),
  ]);
  if (!uuid.safeParse(id).success) notFound();
  const [l] = await query(
    "SELECT * FROM listings WHERE id=$1 AND seller_id=$2 AND status IN ('ACTIVE','RESERVED','DRAFT','EXPIRED')",
    [id, u.id],
  );
  if (!l) notFound();
  return (
    <section className="wrap page narrow">
      <h1>{t.editListing}</h1>
      <Notice error={p.error} />
      <form action={editListing} className="panel stack">
        <input type="hidden" name="id" value={id} />
        <label>
          {t.title}
          <input
            name="title"
            defaultValue={l.title}
            minLength={3}
            maxLength={120}
            required
          />
        </label>
        <label>
          {t.description}
          <textarea
            name="description"
            defaultValue={l.description}
            minLength={10}
            maxLength={5000}
            required
            rows={5}
          />
        </label>
        <label>
          {t.category}
          <select name="category" defaultValue={l.category_id}>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {lang === "my" ? c.name_my : c.name_en}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.condition}
          <select name="condition" defaultValue={l.condition}>
            {Object.entries(conditionLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v[lang === "my" ? 1 : 0]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.listingType}
          <select name="type" defaultValue={l.listing_type}>
            <option value="SALE">{t.selling}</option>
            <option value="FREE">{t.giving}</option>
          </select>
        </label>
        <label>
          {t.price}
          <input
            name="price"
            type="number"
            defaultValue={l.price}
            min="0"
            max="999999999999"
            required
          />
        </label>
        <label>
          {t.location}
          <select name="location" defaultValue={l.location_id}>
            {locations.map((c) => (
              <option value={c.id} key={c.id}>
                {lang === "my" ? c.name_my : c.name_en}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary">{t.update}</button>
      </form>
    </section>
  );
}
