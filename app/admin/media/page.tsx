import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { uiCopy } from "@/lib/ui-i18n";
import { retryAutomation } from "./actions";
export default async function Media() {
  await requirePermission("moderate");
  const ui = await uiCopy();
  const jobs = await query(
    "SELECT j.*,i.listing_id,i.processing_state,l.title FROM image_jobs j JOIN listing_images i ON i.id=j.image_id LEFT JOIN listings l ON l.id=i.listing_id WHERE j.attempts>0 ORDER BY j.attempts DESC LIMIT 50",
  );
  const listings = await query(
    "SELECT id,title,automation_state,moderation_reasons FROM listings WHERE status='PENDING_REVIEW' ORDER BY updated_at LIMIT 50",
  );
  const reviews = await query(
    "SELECT a.*,l.title FROM automated_reviews a JOIN listings l ON l.id=a.listing_id ORDER BY a.created_at DESC LIMIT 50",
  );
  return (
    <section className="wrap page">
      <Link href="/admin">{ui("← Admin")}</Link>
      <h1>{ui("Media & checks")}</h1>
      <h2>{ui("Image processing")}</h2>
      {!jobs.length && <p>{ui("No failed jobs.")}</p>}
      {jobs.map((j) => (
        <div className="panel" key={j.image_id}>
          <strong>{j.title ?? ui("DRAFT")}</strong>
          <p>
            {ui(j.processing_state)} · {j.attempts}
          </p>
          <form action={retryAutomation}>
            <input type="hidden" name="id" value={j.image_id} />
            <input type="hidden" name="kind" value="image" />
            <button className="button secondary">{ui("Retry")}</button>
          </form>
        </div>
      ))}
      <h2>{ui("Automated moderation")}</h2>
      {listings.map((l) => (
        <article className="panel" key={l.id}>
          <Link href={"/admin/listings/" + l.id}>{l.title}</Link>
          <p>{ui(l.automation_state)}</p>
          <p>{l.moderation_reasons.map((r: string) => ui(r)).join(" · ")}</p>
          <form action={retryAutomation}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="kind" value="listing" />
            <button className="button secondary">{ui("Retry")}</button>
          </form>
        </article>
      ))}
      <h2>{ui("Review history")}</h2>
      {reviews.map((r) => (
        <article className="panel" key={r.id}>
          <strong>{r.title}</strong>
          <p>
            {ui(r.outcome === "ALLOW" ? ui("PASSED") : ui("REVIEW"))} ·{" "}
            {r.provider}
          </p>
          <p>{r.reasons.map((reason: string) => ui(reason)).join(" · ")}</p>
        </article>
      ))}
    </section>
  );
}
