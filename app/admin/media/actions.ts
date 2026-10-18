"use server";
import { requirePermission } from "@/lib/auth";
import { permits } from "@/lib/permissions";
import { reviewReasons } from "@/lib/moderation";
import { pool } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { revalidatePath } from "next/cache";
export async function retryAutomation(f: FormData) {
  const actor = await requirePermission("moderate"),
    id = uuid.parse(f.get("id")),
    kind = String(f.get("kind"));
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(742903)");
    const staff = await c.query(
      "SELECT role FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL FOR SHARE",
      [actor.id],
    );
    if (!staff.rows[0] || !permits(staff.rows[0].role, "moderate"))
      throw Error("Forbidden");
    const target =
      kind === "image"
        ? await c.query(
            "SELECT COALESCE(l.seller_id,d.seller_id) owner FROM listing_images i LEFT JOIN listings l ON l.id=i.listing_id LEFT JOIN listing_drafts d ON d.id=i.draft_id WHERE i.id=$1",
            [id],
          )
        : await c.query("SELECT seller_id owner FROM listings WHERE id=$1", [
            id,
          ]);
    if (!target.rowCount) throw Error("Not found");
    await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      target.rows[0].owner,
    ]);
    if (kind === "image") {
      await c.query(
        "UPDATE listing_images SET processing_state='PENDING' WHERE id=$1 AND processing_state='FAILED'",
        [id],
      );
      await c.query(
        "INSERT INTO image_jobs(image_id) SELECT id FROM listing_images WHERE id=$1 ON CONFLICT(image_id) DO UPDATE SET attempts=0,next_attempt=now(),lease_id=NULL,lease_until=NULL,last_error=NULL",
        [id],
      );
    } else if (kind === "listing") {
      const {
        rows: [listing],
      } = await c.query(
        "SELECT * FROM listings WHERE id=$1 AND status='PENDING_REVIEW' FOR UPDATE",
        [id],
      );
      if (!listing) throw Error("Listing is no longer awaiting review");
      const reasons = await reviewReasons(
        c,
        listing.seller_id,
        id,
        listing.title,
        listing.description,
      );
      if (listing.moderation_reasons.includes("policy:resubmission"))
        reasons.push("policy:resubmission");
      await c.query(
        "UPDATE listings SET automation_state='PENDING',revision=revision+1,moderation_reasons=$2::jsonb WHERE id=$1",
        [id, JSON.stringify(reasons)],
      );
      await c.query(
        "INSERT INTO moderation_jobs(listing_id,revision) SELECT id,revision FROM listings WHERE id=$1 AND status='PENDING_REVIEW' ON CONFLICT(listing_id) DO UPDATE SET revision=excluded.revision,attempts=0,next_attempt=now(),lease_id=NULL,lease_until=NULL,last_error=NULL",
        [id],
      );
    } else throw Error("Invalid retry");
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'AUTOMATION_RETRIED',$2)",
      [actor.id, id],
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  revalidatePath("/admin/media");
}
