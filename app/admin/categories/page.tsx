import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { manageCategory } from "../../actions";
export default async function Categories() {
  await requireAdmin();
  const cs = await query("SELECT * FROM categories ORDER BY position,name_en");
  return (
    <section className="wrap page">
      <Link href="/admin">← Administration</Link>
      <h1>Categories</h1>
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
              Category ID
              <input
                name="id"
                defaultValue={c.id}
                readOnly={!!c.id}
                pattern="[a-z0-9-]+"
                required
              />
            </label>
            <label>
              English name
              <input
                name="en"
                defaultValue={c.name_en}
                required
                maxLength={100}
              />
            </label>
            <label>
              Myanmar name
              <input
                name="my"
                defaultValue={c.name_my}
                required
                maxLength={100}
              />
            </label>
            <label>
              Parent category
              <select name="parent" defaultValue={c.parent_id ?? ""}>
                <option value="">None</option>
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
              Position
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
              Enabled
            </label>
            <button className="button primary">
              {c.id ? "Save category" : "Add category"}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
