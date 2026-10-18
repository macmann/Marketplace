import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { manageCategory } from "../../actions";
export default async function Categories() {
  const ui = await uiCopy();

  await requireAdmin();
  const cs = await query("SELECT * FROM categories ORDER BY position,name_en");
  return (
    <section className="wrap page">
      <Link href="/admin">{ui("← Administration")}</Link>
      <h1>{ui("Categories")}</h1>
      <div className="admin-cards">
        {[
          ...cs,
          {
            id: "",
            name_en: "",
            name_my: "",
            position: 0,
            enabled: true,
            parent_id: null,
          },
        ].map((c, i) => (
          <form className="panel stack" action={manageCategory} key={i}>
            <label>
              {ui("Category ID")}
              <input
                name="id"
                defaultValue={c.id}
                readOnly={!!c.id}
                pattern="[a-z0-9-]+"
                required
              />
            </label>
            <label>
              {ui("English name")}
              <input
                name="en"
                defaultValue={c.name_en}
                required
                maxLength={100}
              />
            </label>
            <label>
              {ui("Myanmar name")}
              <input
                name="my"
                defaultValue={c.name_my}
                required
                maxLength={100}
              />
            </label>
            <label>
              {ui("Parent category")}
              <select name="parent" defaultValue={c.parent_id ?? ""}>
                <option value="">{ui("None")}</option>
                {cs
                  .filter((p) => p.id !== c.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_en}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {ui("Position")}
              <input
                type="number"
                name="position"
                defaultValue={c.position}
                min="0"
                max="10000"
              />
            </label>
            <label className="checkbox">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={c.enabled}
              />
              {ui("Enabled")}
            </label>
            <button className="button primary">
              {c.id ? ui("Save category") : ui("Add category")}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
