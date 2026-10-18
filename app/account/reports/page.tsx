import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { releaseCopy } from "@/lib/release-i18n";
import { AccountNav, Pagination } from "@/app/components";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [u, t, f] = await Promise.all([
    requireUser(),
    releaseCopy(),
    searchParams,
  ]);
  const page = Math.max(1, Math.min(10000, Math.floor(Number(f.page)) || 1));
  const rows = await query(
    "SELECT id,reason,detail,status,resolution,created_at,resolved_at FROM reports WHERE reporter_id=$1 ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $2",
    [u.id, (page - 1) * 24],
  );
  return (
    <section className="wrap page narrow">
      <h1>{t.myReports}</h1>
      <AccountNav />
      {!rows.length && <p>{t.noReports}</p>}
      {rows.slice(0, 24).map((r) => (
        <article className="panel" key={r.id}>
          <h2>{r.reason}</h2>
          <p>{r.status}</p>
          <p>{r.detail}</p>
          {r.resolution && <p>{r.resolution}</p>}
          <small>{new Date(r.created_at).toLocaleString()}</small>
        </article>
      ))}
      <Pagination
        path="/account/reports"
        filters={f}
        hasMore={rows.length > 24}
      />
    </section>
  );
}
