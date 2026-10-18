import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { permits } from "@/lib/permissions";
import { query } from "@/lib/db";
import { moderate } from "../actions";
import { Notice } from "../components";
async function Controls({
  id,
  actions,
  revision,
}: {
  id: string;
  actions: string[];
  revision?: number;
}) {
  const ui = await uiCopy();

  return (
    <form action={moderate} className="stack">
      <input type="hidden" name="id" value={id} />
      {revision !== undefined && (
        <input type="hidden" name="revision" value={revision} />
      )}
      <label>
        {ui("Decision reason")}
        <input
          name="note"
          maxLength={1000}
          placeholder={ui("Explain the decision")}
        />
      </label>
      <div>
        {actions.map((a) => (
          <button
            className="button secondary compact"
            name="action"
            value={a}
            key={a}
          >
            {
              (
                {
                  REMOVE: ui("Remove"),
                  RESTORE: ui("Restore"),
                  APPROVE: ui("Approve"),
                  REJECT: ui("Reject"),
                  SUSPEND: ui("Suspend"),
                  UNSUSPEND: ui("Restore"),
                  RESOLVE: ui("Resolve"),
                  DISMISS: ui("Dismiss"),
                } as Record<string, string>
              )[a]
            }
          </button>
        ))}
      </div>
    </form>
  );
}
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ui = await uiCopy();

  const u = await requirePermission("support"),
    canModerate = permits(u.role, "moderate"),
    canConfigure = permits(u.role, "configure");
  const f = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(f.page)) || 1));
  const q = "%" + (f.q ?? "").slice(0, 100).replace(/[\\%_]/g, "\\$&") + "%";
  const reports = await query(
    "SELECT r.*,l.title,ru.name reported_name,m.body FROM reports r LEFT JOIN listings l ON l.id=r.listing_id LEFT JOIN users ru ON ru.id=r.reported_user_id LEFT JOIN messages m ON m.id=r.message_id WHERE r.status='OPEN' ORDER BY r.created_at LIMIT 100",
  );
  const listings = canModerate
    ? await query(
        "SELECT id,title,status,revision,moderation_reasons FROM listings WHERE title ILIKE $1 ORDER BY (status='PENDING_REVIEW') DESC,created_at DESC LIMIT 51 OFFSET $2",
        [q, (page - 1) * 50],
      )
    : [];
  const users = canModerate
    ? await query(
        "SELECT id,name,suspended FROM users WHERE role='USER' AND deleted_at IS NULL AND name ILIKE $1 ORDER BY created_at DESC LIMIT 51 OFFSET $2",
        [q, (page - 1) * 50],
      )
    : [];
  const logs = canModerate
    ? await query(
        "SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY created_at DESC LIMIT 50",
      )
    : [];
  const metrics = canConfigure
    ? await query(
        "SELECT day,event,count FROM daily_metrics WHERE day>current_date-30 ORDER BY day DESC,event",
      )
    : [];
  const [counts] = await query(
    "SELECT (SELECT count(*) FROM users WHERE deleted_at IS NULL) users,(SELECT count(*) FROM listings WHERE status='ACTIVE') listings,(SELECT count(*) FROM conversations) conversations,(SELECT count(*) FROM reports WHERE status='OPEN') reports,(SELECT count(*) FROM listings WHERE status='PENDING_REVIEW') pending",
  );
  return (
    <section className="wrap page">
      <h1>{ui("Marketplace administration")}</h1>
      <Notice error={f.error} />
      {canModerate && (
        <form className="panel filter-row">
          <label>
            {ui("Search listings and users")}
            <input name="q" defaultValue={f.q} maxLength={100} />
          </label>
          <button className="button secondary">{ui("Search")}</button>
        </form>
      )}
      {canConfigure && (
        <nav className="account-nav">
          <Link href="/admin/categories">{ui("Categories")}</Link>
          <Link href="/admin/locations">{ui("Locations")}</Link>
          <Link href="/admin/attributes">{ui("Category fields")}</Link>
          <Link href="/admin/safety">{ui("Safety & staff")}</Link>
          <Link href="/admin/media">{ui("Media & checks")}</Link>
          <Link href="/admin/operations">{ui("Operations")}</Link>
        </nav>
      )}
      <div className="stats">
        {Object.entries(counts).map(([k, v]) => (
          <div className="panel" key={k}>
            <strong>{String(v)}</strong>
            <span>{ui(k)}</span>
          </div>
        ))}
      </div>
      {canModerate && !canConfigure && (
        <Link href="/admin/media">{ui("Media & checks")}</Link>
      )}
      <h2>{ui("Reports")}</h2>
      {!reports.length && <p>{ui("No open reports.")}</p>}
      {reports.map((r) => (
        <div className="panel" key={r.id}>
          <h3>
            {r.title || r.reported_name || "Reported message"} · {r.reason}
          </h3>
          <p>{r.detail}</p>
          {r.body && <blockquote>{r.body}</blockquote>}
          {r.listing_id && (
            <Link href={"/admin/listings/" + r.listing_id}>
              {ui("Review listing")}
            </Link>
          )}
          <Controls id={r.id} actions={["RESOLVE", "DISMISS"]} />
        </div>
      ))}
      {canModerate && (
        <>
          <h2>{ui("Listings")}</h2>
          <div className="admin-table">
            {listings.slice(0, 50).map((l) => (
              <div className="admin-row" key={l.id}>
                <Link href={"/admin/listings/" + l.id}>{l.title}</Link>
                <span>
                  {ui(l.status)}
                  {l.moderation_reasons.length > 0 && (
                    <small>{l.moderation_reasons.join("; ")}</small>
                  )}
                </span>
                <Controls
                  id={l.id}
                  revision={l.revision}
                  actions={
                    l.status === "PENDING_REVIEW"
                      ? ["APPROVE", "REJECT"]
                      : l.status === "REMOVED"
                        ? ["RESTORE"]
                        : ["REMOVE"]
                  }
                />
              </div>
            ))}
          </div>
          <h2>{ui("Users")}</h2>
          {users.slice(0, 50).map((u) => (
            <div className="admin-row" key={u.id}>
              <span>{u.name}</span>
              <span>{u.suspended ? ui("Suspended") : ui("Active")}</span>
              <Controls
                id={u.id}
                actions={[u.suspended ? "UNSUSPEND" : "SUSPEND"]}
              />
            </div>
          ))}
          <nav className="pagination">
            {page > 1 && (
              <Link
                className="button secondary"
                href={
                  "/admin?" +
                  new URLSearchParams({ q: f.q ?? "", page: String(page - 1) })
                }
              >
                {ui("← Previous page")}
              </Link>
            )}
            {(listings.length > 50 || users.length > 50) && (
              <Link
                className="button secondary"
                href={
                  "/admin?" +
                  new URLSearchParams({ q: f.q ?? "", page: String(page + 1) })
                }
              >
                {ui("Next page →")}
              </Link>
            )}
          </nav>
          <h2>{ui("Audit log")}</h2>
          {logs.map((l) => (
            <p className="audit-row" key={l.id}>
              {new Date(l.created_at).toISOString()} · {l.name} · {l.action} ·{" "}
              {l.entity_id} · {l.detail}
            </p>
          ))}
        </>
      )}
      {canConfigure && (
        <>
          <h2>{ui("Activity · last 30 days")}</h2>
          <p>
            {ui(
              "Daily aggregate counters. No visitor identifiers, search text, or message content is recorded.",
            )}
          </p>
          {metrics.map((m) => (
            <p key={m.day + m.event}>
              {new Date(m.day).toISOString().slice(0, 10)} · {m.event}:{" "}
              {m.count}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
