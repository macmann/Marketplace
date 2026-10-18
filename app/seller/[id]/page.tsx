import ReportForm from "@/app/report-form";
import { currentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { catalog } from "@/lib/marketplace";
import { translations } from "@/lib/i18n";
import { ListingCard, Pagination } from "../../components";
export default async function Seller({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [u] = await query(
    "SELECT id,name,phone_verified,created_at FROM users WHERE id=$1 AND NOT suspended",
    [id],
  );
  if (!u) notFound();
  const t = await translations();
  const viewer = await currentUser();
  const f = await searchParams;
  const ls = await catalog(f, id, undefined, true);
  return (
    <section className="wrap page">
      <div className="seller">
        <span className="avatar">{u.name.slice(0, 1)}</span>
        <h1>{u.name}</h1>
      </div>
      <p>
        {t.member} {new Date(u.created_at).getFullYear()}
      </p>
      {u.phone_verified && <p>✓ {t.verified}</p>}
      {viewer && viewer.id !== id && <ReportForm kind="user" id={id} />}
      <div className="listing-grid">
        {ls.slice(0, 24).map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      <Pagination filters={f} path={"/seller/" + id} hasMore={ls.length > 24} />
    </section>
  );
}
