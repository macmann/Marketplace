import { reportReasons } from "@/lib/report-reasons";
import { recordMetric } from "@/lib/metrics";
import Link from "next/link";
import { listingCopy } from "@/lib/listing-i18n";
import { notFound } from "next/navigation";
import { cache } from "react";
import { query } from "@/lib/db";
import { listingSelect, Listing } from "@/lib/marketplace";
import { currentUser } from "@/lib/auth";
import { uuid } from "@/lib/validation";
import { translations, locale, money, conditionLabels } from "@/lib/i18n";
import { favorite, startConversation, reportListing } from "../../actions";
import { Notice } from "../../components";
const getListing = cache(async (id: string) => {
  if (!uuid.safeParse(id).success) return null;
  return (
    (
      await query<Listing>(
        listingSelect +
          " WHERE l.id=$1 AND l.status IN ('ACTIVE','RESERVED','SOLD') AND (l.status='SOLD' OR l.expires_at>now()) AND NOT u.suspended AND category_visible(l.category_id)",
        [id],
      )
    )[0] ?? null
  );
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const l = await getListing(id);
  return l
    ? {
        title: l.title,
        description: l.description.slice(0, 160),
        alternates: { canonical: "/listing/" + id },
        openGraph: {
          title: l.title,
          description: l.description.slice(0, 160),
          images: l.image ? ["/media/" + l.image] : [],
        },
      }
    : { title: "Listing not found" };
}
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { id } = await params;
  const l = await getListing(id);
  if (!l) notFound();
  await recordMetric("VIEW");
  const [t, lang, u, images, p] = await Promise.all([
    translations(),
    locale(),
    currentUser(),
    query(
      "SELECT * FROM listing_images WHERE listing_id=$1 ORDER BY position",
      [id],
    ),
    searchParams,
  ]);
  const a = await listingCopy();
  const attributes = await query(
    "SELECT a.name_en,a.name_my,a.type,v.value FROM listing_attribute_values v JOIN category_attributes a ON a.id=v.attribute_id WHERE v.listing_id=$1 ORDER BY a.position,a.name_en",
    [id],
  );
  const saved = u
    ? (
        await query(
          "SELECT 1 FROM favorites WHERE user_id=$1 AND listing_id=$2",
          [u.id, id],
        )
      ).length > 0
    : false;
  const statusLabel: Record<string, string> = {
    ACTIVE: t.active,
    RESERVED: t.reserved,
    SOLD: t.sold,
  };
  return (
    <section className="wrap page">
      <Link className="back" href="/">
        ← {t.back}
      </Link>
      <Notice message={p.reported ? t.reportThanks : undefined} />
      <div className="detail-grid">
        <div>
          <div className="detail-photo">
            {images[0] && (
              <img
                src={"/media/" + images[0].storage_key}
                alt={l.title}
                width="1000"
                height="800"
              />
            )}
          </div>
          <div className="gallery">
            {images.slice(1).map((im, i) => (
              <a href={"/media/" + im.storage_key} key={im.id}>
                <img
                  src={"/media/" + im.storage_key}
                  alt={l.title + " " + (i + 2)}
                  loading="lazy"
                  width="240"
                  height="200"
                />
              </a>
            ))}
          </div>
          <section className="panel">
            <h2>{t.description}</h2>
            <p className="prose">{l.description}</p>
            {attributes.length > 0 && (
              <section>
                <h2>{a.details}</h2>
                <dl className="attribute-list">
                  {attributes.map((v, i) => (
                    <div key={i}>
                      <dt>{lang === "my" ? v.name_my : v.name_en}</dt>
                      <dd>
                        {typeof v.value === "boolean"
                          ? v.value
                            ? a.yes
                            : a.no
                          : String(v.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </section>
        </div>
        <aside>
          <span className="eyebrow">
            {lang === "my" ? l.category_my : l.category_en}
          </span>
          <h1>{l.title}</h1>
          <strong className="detail-price">
            {l.listing_type === "FREE" ? t.freeLabel : money(l.price)}
          </strong>
          <div className="listing-facts">
            <span>⌖ {lang === "my" ? l.location_my : l.location_en}</span>
            <span>
              {
                conditionLabels[l.condition as keyof typeof conditionLabels]?.[
                  lang === "my" ? 1 : 0
                ]
              }
            </span>
            <span>{statusLabel[l.status]}</span>
          </div>
          <p className="muted">
            {new Date(l.created_at).toLocaleDateString(
              lang === "my" ? "my-MM" : "en-GB",
            )}
          </p>
          <div className="seller">
            <span className="avatar">{l.seller_name.slice(0, 1)}</span>
            <div>
              <Link href={"/seller/" + l.seller_id}>
                <strong>{l.seller_name}</strong>
              </Link>
              {l.phone_verified && <small>✓ {t.verified}</small>}
            </div>
          </div>
          {u?.id !== l.seller_id && l.status !== "SOLD" && (
            <form action={startConversation}>
              <input type="hidden" name="id" value={id} />
              <button className="button primary full">▤ {t.contact}</button>
            </form>
          )}
          <form action={favorite}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="saved" value={String(saved)} />
            <button className="button secondary full">
              {saved ? "♥" : "♡"} {saved ? t.unsave : t.save}
            </button>
          </form>
          <div className="safety-box">
            <h3>♧ {t.safetyTitle}</h3>
            <p>{t.safety}</p>
          </div>
          <details className="panel">
            <summary>{t.report}</summary>
            <form action={reportListing} className="stack">
              <input type="hidden" name="id" value={id} />
              <label>
                {t.reason}
                <select name="reason">
                  {reportReasons.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                {t.details}
                <textarea name="detail" maxLength={2000} />
              </label>
              <button className="button secondary">{t.submitReport}</button>
            </form>
          </details>
        </aside>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: l.title,
            description: l.description,
            image: images.map(
              (im) =>
                (process.env.APP_URL || "http://localhost:3000") +
                "/media/" +
                im.storage_key,
            ),
            offers: {
              "@type": "Offer",
              price: l.price,
              priceCurrency: "MMK",
              availability:
                l.status === "SOLD"
                  ? "https://schema.org/SoldOut"
                  : "https://schema.org/InStock",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
