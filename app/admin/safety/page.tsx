import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { Notice } from "@/app/components";
import { safetySettings, changeRole } from "./actions";
export default async function Safety({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  await requireAdmin();
  const [settings] = await query("SELECT * FROM marketplace_settings");
  const rules = await query("SELECT * FROM moderation_rules ORDER BY phrase");
  const f = await searchParams;
  const staff = await query(
    "SELECT id,name,role FROM users WHERE deleted_at IS NULL AND NOT suspended AND (name ILIKE $1 OR email ILIKE $1 OR id::text=$2) ORDER BY role,name LIMIT 100",
    [
      "%" + (f.q ?? "").slice(0, 100).replace(/[\\%_]/g, "\\$&") + "%",
      f.q ?? "",
    ],
  );
  return (
    <section className="wrap page narrow">
      <Link href="/admin">← Admin</Link>
      <h1>Safety policy & staff</h1>
      <Notice error={f.error} />
      <form action={safetySettings} className="panel stack">
        <h2>Publication policy</h2>
        <label>
          <input
            type="checkbox"
            name="review_all"
            defaultChecked={settings.review_all}
          />{" "}
          Review every new or edited listing before publication
        </label>
        <p>
          Enabled text rules and exact duplicate detection always send matching
          listings for review. Editing a flagged listing does not approve it.
        </p>
        <button className="button primary">Save policy</button>
      </form>
      <form action={safetySettings} className="panel stack">
        <h2>Flagged phrases</h2>
        <label>
          Phrase
          <input name="phrase" minLength={2} maxLength={100} required />
        </label>
        <button className="button secondary">Add rule</button>
      </form>
      {rules.map((r) => (
        <form action={safetySettings} key={r.id} className="panel">
          <input type="hidden" name="rule" value={r.id} />
          {r.phrase} · {r.enabled ? "Enabled" : "Disabled"}{" "}
          <button className="text-button">Toggle</button>
        </form>
      ))}
      <h2>Staff roles</h2>
      <form className="panel stack">
        <label>
          Find an account by name, email or ID
          <input name="q" defaultValue={f.q} maxLength={100} />
        </label>
        <button className="button secondary">Find account</button>
      </form>
      <p>
        Support resolves reports. Moderators also review listings and suspend
        ordinary accounts. Administrators configure the marketplace and manage
        roles. Role changes sign the affected account out.
      </p>
      {staff.map((u) => (
        <form action={changeRole} key={u.id} className="panel stack">
          <strong>{u.name}</strong>
          <input type="hidden" name="id" value={u.id} />
          <label>
            Role
            <select name="role" defaultValue={u.role}>
              {["USER", "SUPPORT", "MODERATOR", "ADMIN"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button className="button secondary">Update role</button>
        </form>
      ))}
    </section>
  );
}
