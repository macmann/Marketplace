import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { translations } from "@/lib/i18n";
import { moderate } from "../actions";
export default async function Admin() {
  await requireAdmin();
  const t = await translations();
  const [counts] = await query(
    "SELECT (SELECT count(*) FROM users) users,(SELECT count(*) FROM listings WHERE status='ACTIVE') listings,(SELECT count(*) FROM conversations) conversations,(SELECT count(*) FROM reports WHERE status='OPEN') reports",
  );
  const reports = await query(
    "SELECT r.*,l.title FROM reports r JOIN listings l ON l.id=r.listing_id WHERE r.status='OPEN' ORDER BY r.created_at LIMIT 100",
  );
  const listings = await query(
    "SELECT id,title,status FROM listings ORDER BY created_at DESC LIMIT 50",
  );
  const users = await query(
    "SELECT id,name,email,suspended FROM users WHERE role<>'ADMIN' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50",
  );
  const logs = await query(
    "SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY created_at DESC LIMIT 30",
  );
  return (
    <section className="wrap page">
      <h1>{t.adminTitle}</h1>
      <nav className="account-nav">
        <Link href="/admin/categories">Categories</Link>
        <Link href="/admin/locations">Locations</Link>
      </nav>
      <div className="stats">
        {Object.entries(counts).map(([k, v]) => (
          <div className="panel" key={k}>
            <strong>{String(v)}</strong>
            <span>{k}</span>
          </div>
        ))}
      </div>
      <h2>Reports</h2>
      {reports.length ? (
        reports.map((r) => (
          <div className="panel" key={r.id}>
            <h3>
              {r.title} · {r.reason}
            </h3>
            <p>{r.detail}</p>
            <form action={moderate}>
              <input type="hidden" name="id" value={r.id} />
              <button
                className="button secondary"
                name="action"
                value="RESOLVE"
              >
                Resolve
              </button>
            </form>
          </div>
        ))
      ) : (
        <p>No open reports.</p>
      )}
      <h2>Listings</h2>
      <div className="admin-table">
        {listings.map((l) => (
          <div className="admin-row" key={l.id}>
            <a href={"/listing/" + l.id}>{l.title}</a>
            <span>{l.status}</span>
            <form action={moderate}>
              <input type="hidden" name="id" value={l.id} />
              <button
                className="button secondary compact"
                name="action"
                value={l.status === "REMOVED" ? "RESTORE" : "REMOVE"}
              >
                {l.status === "REMOVED" ? "Restore" : "Remove"}
              </button>
            </form>
          </div>
        ))}
      </div>
      <h2>Users</h2>
      <div className="admin-table">
        {users.map((u) => (
          <div className="admin-row" key={u.id}>
            <span>
              {u.name}
              <small>{u.email}</small>
            </span>
            <span>{u.suspended ? "Suspended" : "Active"}</span>
            <form action={moderate}>
              <input type="hidden" name="id" value={u.id} />
              <button
                className="button secondary compact"
                name="action"
                value={u.suspended ? "UNSUSPEND" : "SUSPEND"}
              >
                {u.suspended ? "Restore" : "Suspend"}
              </button>
            </form>
          </div>
        ))}
      </div>
      <h2>Audit log</h2>
      {logs.map((l) => (
        <p className="audit-row" key={l.id}>
          {new Date(l.created_at).toISOString()} · {l.name} · {l.action} ·{" "}
          {l.entity_id}
        </p>
      ))}
    </section>
  );
}
