import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { manageLocation } from "../../actions";
export default async function Locations({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const ui = await uiCopy();

  await requireAdmin();
  const f = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(f.page) || 1));
  const ls = await query("SELECT * FROM locations ORDER BY kind,name_en");
  return (
    <section className="wrap page">
      <Link href="/admin">{ui("← Administration")}</Link>
      <h1>{ui("Locations")}</h1>
      <form className="panel">
        <label>
          {ui("Search")}
          <input name="q" defaultValue={f.q} />
        </label>
        <button className="button secondary">{ui("Search")}</button>
      </form>
      <p>
        {ui("Source reference")}
        {ui(": geoBoundaries 2019 / MIMU · 330")}
      </p>
      <div className="admin-cards">
        {[
          ...ls
            .filter(
              (l) =>
                l.kind !== "COUNTRY" &&
                (!f.q ||
                  (l.name_en + " " + l.name_my + " " + l.id)
                    .toLowerCase()
                    .includes(f.q.toLowerCase())),
            )
            .slice((page - 1) * 20, page * 20),
          {
            id: "",
            name_en: "",
            name_my: "",
            kind: "TOWNSHIP",
            parent_id: null,
          },
        ].map((l, i) => (
          <form action={manageLocation} className="panel stack" key={i}>
            <label>
              {ui("Location ID")}
              <input
                name="id"
                defaultValue={l.id}
                readOnly={!!l.id}
                required
                pattern="[a-z0-9-]+"
              />
            </label>
            <label>
              {ui("English name")}
              <input
                name="en"
                defaultValue={l.name_en}
                maxLength={100}
                required
              />
            </label>
            <label>
              {ui("Myanmar name")}
              <input
                name="my"
                defaultValue={l.name_my}
                maxLength={100}
                required
              />
            </label>
            <label>
              {ui("Level")}
              <select name="kind" defaultValue={l.kind}>
                {["REGION", "DISTRICT", "CITY", "TOWNSHIP"].map((k) => (
                  <option key={k} value={k}>
                    {ui(k)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {ui("Parent (country → region → city → township)")}
              <select name="parent" defaultValue={l.parent_id ?? ""} required>
                <option value="">{ui("Select")}</option>
                {ls
                  .filter(
                    (p) =>
                      p.id !== l.id && p.kind !== "TOWNSHIP" && !p.canonical_id,
                  )
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name_en} · {p.kind}
                    </option>
                  ))}
              </select>
            </label>
            <button className="button primary">
              {l.id ? ui("Save location") : ui("Add location")}
            </button>
          </form>
        ))}
      </div>
      <nav className="pagination">
        {page > 1 && (
          <Link
            href={
              "/admin/locations?" +
              new URLSearchParams({ q: f.q ?? "", page: String(page - 1) })
            }
          >
            {ui("Previous page")}
          </Link>
        )}
        {page * 20 < ls.length && (
          <Link
            href={
              "/admin/locations?" +
              new URLSearchParams({ q: f.q ?? "", page: String(page + 1) })
            }
          >
            {ui("Next page")}
          </Link>
        )}
      </nav>
    </section>
  );
}
