import Link from "next/link";
import { catalog, options } from "@/lib/marketplace";
import { translations, locale } from "@/lib/i18n";
import { ListingCard, Filters, Empty, Pagination } from "./components";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const f = await searchParams;
  const [t, lang, listings, { categories }] = await Promise.all([
    translations(),
    locale(),
    catalog(f),
    options(),
  ]);
  const icons = [
    "⌁",
    "▱",
    "◉",
    "✧",
    "♧",
    "⚑",
    "▤",
    "◇",
    "◎",
    "✿",
    "⚒",
    "▦",
    "♧",
    "＋",
  ];
  return (
    <>
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" />{" "}
              {lang === "my"
                ? "သင့်အနီးအနားမှ ဈေးကွက်"
                : "YOUR NEIGHBOURHOOD MARKETPLACE"}
            </span>
            <h1>
              {lang === "my" ? (
                <>
                  အနီးအနားမှာ
                  <br />
                  <em>ကောင်းတာလေးတွေ ရှိတယ်။</em>
                </>
              ) : (
                <>
                  Good things.
                  <br />
                  <em>Closer to home.</em>
                </>
              )}
            </h1>
            <p>{t.subtitle}</p>
            <div className="hero-links">
              <a className="button primary" href="#discover">
                {t.browse} ↗
              </a>
              <Link className="quiet-link" href="/sell">
                {t.sell} →
              </Link>
            </div>
            <div className="hero-note">
              <span>↻</span> {t.tagline}
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-circle" />
            <div className="art-caption">
              A SECOND LIFE
              <br />
              <strong>A new favourite.</strong>
            </div>
            <div className="chair">
              <div className="chair-back" />
              <div className="chair-seat" />
              <div className="chair-leg left" />
              <div className="chair-leg right" />
            </div>
            <div className="plant">
              <div className="leaf one" />
              <div className="leaf two" />
              <div className="leaf three" />
              <div className="pot" />
            </div>
            <div className="art-tag">
              <span>♡</span>{" "}
              {lang === "my" ? "လက်ဆင့်ကမ်းမယ်" : "Pass something good on."}
            </div>
            <span className="sparkle">✳</span>
          </div>
        </div>
      </section>
      <section className="wrap discovery" id="discover">
        <Filters filters={f} />
        <div className="section-heading">
          <h2>{t.category}</h2>
          <span>{t.tagline}</span>
        </div>
        <div className="categories">
          {categories.slice(0, 8).map((c, i) => (
            <Link
              className={f.category === c.id ? "selected" : ""}
              href={"/?category=" + c.id + "#discover"}
              key={c.id}
            >
              <span>{icons[i]}</span>
              {lang === "my" ? c.name_my : c.name_en}
            </Link>
          ))}
        </div>
        <div className="section-heading feed-heading">
          <div>
            <span className="eyebrow">
              {lang === "my"
                ? "ရှာဖွေကြည့်ပါ"
                : "A LITTLE DISCOVERY GOES A LONG WAY"}
            </span>
            <h2>{f.q ? "“" + f.q + "”" : t.latest}</h2>
          </div>
          <span>
            {listings.length > 24 ? "24+" : listings.length} {t.results}
          </span>
        </div>
        {listings.length ? (
          <div className="listing-grid">
            {listings.slice(0, 24).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <Empty />
        )}
        <Pagination filters={f} path="/" hasMore={listings.length > 24} />
        <Link className="free-banner" href="/free">
          <span className="free-art">↻</span>
          <div>
            <span className="eyebrow">GOOD FOR YOU. GOOD FOR THE PLANET.</span>
            <h2>{t.free}</h2>
            <p>
              {lang === "my"
                ? "အသုံးဝင်တာလေးတွေ အခမဲ့ရှာမယ်"
                : "Some things are too good to throw away. Find them a new home."}
            </p>
          </div>
          <span className="circle-arrow">↗</span>
        </Link>
        <div className="trust-row">
          <span>
            ⌖ <strong>{t.location}</strong>
            <p>Discover by city &amp; township</p>
          </span>
          <span>
            ♡ <strong>{t.safetyTitle}</strong>
            <p>{t.safety}</p>
          </span>
          <span>
            ↻ <strong>{t.giving}</strong>
            <p>A little less waste. A little more community.</p>
          </span>
        </div>
      </section>
    </>
  );
}
