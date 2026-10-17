import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { options } from "@/lib/marketplace";
import { translations, locale, conditionLabels } from "@/lib/i18n";
import { Notice } from "../components";
import ListingForm from "./listing-form";
export default async function Sell({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const u = await requireUser();
  if (!u.phone_verified) redirect("/verify");
  const [t, lang, p, { categories, locations }] = await Promise.all([
    translations(),
    locale(),
    searchParams,
    options(),
  ]);
  return (
    <section className="wrap page narrow">
      <span className="eyebrow">SELL · SHARE · MAKE SOME SPACE</span>
      <h1>{t.newListing}</h1>
      <p>{t.newListingBody}</p>
      <Notice error={p.error} />
      <ListingForm
        t={t}
        categories={categories.map((c) => ({
          id: c.id,
          label: lang === "my" ? c.name_my : c.name_en,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          label: lang === "my" ? l.name_my : l.name_en,
        }))}
        conditions={Object.entries(conditionLabels).map(([id, v]) => ({
          id,
          label: v[lang === "my" ? 1 : 0],
        }))}
      />
    </section>
  );
}
