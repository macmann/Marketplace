import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { manageLocation } from "../../actions";
export default async function Locations() {
  await requireAdmin();
  const ls = await query("SELECT * FROM locations ORDER BY kind,name_en");
  return (
    <section className="wrap page">
      <Link href="/admin">← Administration</Link>
      <h1>Locations</h1>
      <div className="admin-cards">
        {[
          ...ls.filter((l) => l.kind !== "COUNTRY"),
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
              Location ID
              <input
                name="id"
                defaultValue={l.id}
                readOnly={!!l.id}
                required
                pattern="[a-z0-9-]+"
              />
            </label>
            <label>
              English name
              <input
                name="en"
                defaultValue={l.name_en}
                maxLength={100}
                required
              />
            </label>
            <label>
              Myanmar name
              <input
                name="my"
                defaultValue={l.name_my}
                maxLength={100}
                required
              />
            </label>
            <label>
              Level
              <select name="kind" defaultValue={l.kind}>
                {["REGION", "CITY", "TOWNSHIP"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              Parent (country → region → city → township)
              <select name="parent" defaultValue={l.parent_id ?? ""} required>
                <option value="">Select</option>
                {ls
                  .filter((p) => p.id !== l.id)
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name_en} · {p.kind}
                    </option>
                  ))}
              </select>
            </label>
            <button className="button primary">
              {l.id ? "Save location" : "Add location"}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
