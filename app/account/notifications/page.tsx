import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { releaseCopy } from "@/lib/release-i18n";
import { AccountNav, Pagination } from "@/app/components";
import { readNotifications } from "./actions";
import Push from "./push";
import Alerts from "./alerts";
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ui = await uiCopy();

  const [u, t, f] = await Promise.all([
    requireUser(),
    releaseCopy(),
    searchParams,
  ]);
  const page = Math.max(1, Math.min(10000, Math.floor(Number(f.page)) || 1));
  const ns = await query(
    "SELECT n.*,l.status FROM notifications n LEFT JOIN listings l ON l.id=n.listing_id WHERE n.user_id=$1 ORDER BY n.created_at DESC,n.id DESC LIMIT 25 OFFSET $2",
    [u.id, (page - 1) * 24],
  );
  return (
    <section className="wrap page narrow">
      <h1>{t.notifications}</h1>
      <AccountNav />
      <Push />
      <Alerts
        enable={t.enableAlerts}
        enabled={t.alertsEnabled}
        unavailable={t.alertsUnavailable}
      />
      <form action={readNotifications}>
        <button className="button secondary">{t.markRead}</button>
      </form>
      {!ns.length && <p>{t.noNotifications}</p>}
      {ns.slice(0, 24).map((n) => (
        <div key={n.id} className="panel">
          <strong>
            {!n.read_at && "● "}
            {n.kind === "MESSAGE"
              ? t.newMessage
              : n.kind === "REPORT"
                ? t.reportUpdate
                : t.listingUpdate}
          </strong>
          <p>{ui(n.state ?? (n.kind === "LISTING" ? n.status : ""))}</p>
          <small>{new Date(n.created_at).toLocaleString()}</small>{" "}
          <Link
            href={
              n.report_id
                ? "/account/reports"
                : n.conversation_id
                  ? "/account/messages/" + n.conversation_id
                  : "/account/listings"
            }
          >
            {t.open} →
          </Link>
        </div>
      ))}
      <Pagination
        path="/account/notifications"
        filters={f}
        hasMore={ns.length > 24}
      />
    </section>
  );
}
