import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { query } from "@/lib/db";
import { options } from "@/lib/marketplace";
import { translations, locale, conditionLabels } from "@/lib/i18n";
import { listingCopy } from "@/lib/listing-i18n";
import {
  emptyPayload,
  type ListingPayload,
  type Attribute,
} from "@/lib/listing-validation";
import ListingForm from "./listing-form";
import { Notice } from "../components";
export default async function Editor({
  id = "",
  kind = "draft",
  revision = 0,
  initial = emptyPayload,
  images = [],
  saved = false,
  verified,
}: {
  id?: string;
  kind?: "draft" | "listing";
  revision?: number;
  initial?: ListingPayload;
  images?: { id: string; storage_key: string }[];
  saved?: boolean;
  verified: boolean;
}) {
  const [t, a, lang, { categories, locations }, definitions] =
    await Promise.all([
      translations(),
      listingCopy(),
      locale(),
      options(),
      query<Attribute>(
        "SELECT * FROM category_attributes WHERE enabled ORDER BY position,name_en",
      ),
    ]);
  const ui = await uiCopy();
  return (
    <section className="wrap page narrow">
      <h1>{id ? a.edit : t.newListing}</h1>
      {kind === "draft" && <p>{a.draftHelp}</p>}
      <p className="muted">
        {ui(
          "Small previews are ready first. Larger photos and safety checks run in the background.",
        )}
      </p>
      <p className="muted">
        {ui(
          "Automated checks may send listing text and processed photos to the moderation provider configured by the operator. Private drafts are not sent.",
        )}
      </p>
      {!verified && (
        <div className="notice">
          <p>{a.phoneRequired}</p>
          <Link href="/verify">{t.verify} →</Link>
        </div>
      )}
      <Notice message={saved ? a.saved : undefined} />
      <ListingForm
        key={id + ":" + revision}
        t={t}
        a={a}
        lang={lang}
        categories={categories.map((c) => ({
          id: c.id,
          label: lang === "my" ? c.name_my : c.name_en,
          parent_id: c.parent_id,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          label: lang === "my" ? l.display_my : l.display_en,
          parent_id: l.display_parent,
          kind: l.kind,
          canonical_id: l.canonical_id,
          aliases: l.aliases,
        }))}
        conditions={Object.entries(conditionLabels).map(([id, v]) => ({
          id,
          label: v[lang === "my" ? 1 : 0],
        }))}
        definitions={definitions}
        id={id}
        kind={kind}
        revision={revision}
        initial={initial}
        images={images}
      />
    </section>
  );
}
