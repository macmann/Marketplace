import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { listingCopy } from "@/lib/listing-i18n";
import { locale } from "@/lib/i18n";
import { Notice } from "../../components";
import { saveAttribute } from "../../sell/actions";
export default async function Attributes({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const ui = await uiCopy();

  await requireAdmin();
  const [a, lang, p, cs, attrs] = await Promise.all([
    listingCopy(),
    locale(),
    searchParams,
    query("SELECT * FROM categories ORDER BY name_en"),
    query(
      "SELECT * FROM category_attributes ORDER BY category_id,position,key",
    ),
  ]);
  const empty = {
    id: "",
    category_id: "electronics",
    key: "",
    name_en: "",
    name_my: "",
    type: "TEXT",
    choices: [],
    required: false,
    enabled: true,
    position: 0,
  };
  return (
    <section className="wrap page">
      <Link href="/admin">{ui("← Administration")}</Link>
      <h1>{a.attributes}</h1>
      <p>{a.adminHelp}</p>
      <Notice
        error={p.error}
        message={p.saved ? a.attributeSaved : undefined}
      />
      <div className="admin-cards">
        {[...attrs, empty].map((d, i) => (
          <form className="panel stack" action={saveAttribute} key={d.id || i}>
            <h2>
              {d.id ? (lang === "my" ? d.name_my : d.name_en) : a.newAttribute}
            </h2>
            <input name="id" type="hidden" value={d.id} />
            {d.id && (
              <>
                <input type="hidden" name="category" value={d.category_id} />
                <input type="hidden" name="type" value={d.type} />
              </>
            )}
            <label>
              {ui("Category")}
              <select
                name={d.id ? undefined : "category"}
                disabled={!!d.id}
                defaultValue={d.category_id}
                aria-label={ui("Category")}
              >
                {cs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "my" ? c.name_my : c.name_en}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {a.attributeKey}
              <input
                name="key"
                defaultValue={d.key}
                pattern="[a-z][a-z0-9_]{0,49}"
                required
                readOnly={!!d.id}
              />
            </label>
            <label>
              {a.attributeName}
              <input
                name="en"
                defaultValue={d.name_en}
                required
                maxLength={100}
              />
            </label>
            <label>
              {a.myanmarName}
              <input
                name="my"
                defaultValue={d.name_my}
                required
                maxLength={100}
              />
            </label>
            <label>
              {a.attributeType}
              <select
                name={d.id ? undefined : "type"}
                disabled={!!d.id}
                defaultValue={d.type}
              >
                {["TEXT", "NUMBER", "BOOLEAN", "ENUM", "DATE"].map((k) => (
                  <option key={k} value={k}>
                    {ui(k)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {a.choices}
              <textarea
                name="choices"
                defaultValue={d.choices.join("\n")}
                maxLength={5100}
              />
            </label>
            <label>
              {a.position}
              <input
                name="position"
                type="number"
                min={0}
                max={10000}
                defaultValue={d.position}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="required"
                defaultChecked={d.required}
              />
              {a.required}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={d.enabled}
              />
              {a.enabled}
            </label>
            <button className="button primary">
              {d.id ? a.saveAttribute : a.addAttribute}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
