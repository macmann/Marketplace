import { reportReasons } from "./report-reasons";
import type { Pool } from "pg";
import { pool } from "./db";
export async function createReport(
  reporter: string,
  kind: string,
  id: string,
  reason: string,
  detail: string,
  db: Pool = pool,
) {
  if (
    !["listing", "user", "message"].includes(kind) ||
    !reportReasons.includes(reason as (typeof reportReasons)[number]) ||
    detail.length > 2000
  )
    throw Error("Invalid report");
  const targets: Record<string, string> = {
    listing: "listing_id",
    user: "reported_user_id",
    message: "message_id",
  };
  const visible =
    kind === "listing"
      ? await db.query(
          "SELECT 1 FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=$1 AND l.status IN ('ACTIVE','RESERVED','SOLD') AND NOT u.suspended AND l.seller_id<>$2",
          [id, reporter],
        )
      : kind === "user"
        ? await db.query(
            "SELECT 1 FROM users WHERE id=$1 AND id<>$2 AND deleted_at IS NULL",
            [id, reporter],
          )
        : await db.query(
            "SELECT 1 FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.id=$1 AND m.sender_id<>$2 AND (c.buyer_id=$2 OR c.seller_id=$2)",
            [id, reporter],
          );
  if (!visible.rowCount) throw Error("Report target unavailable");
  await db.query(
    `INSERT INTO reports(reporter_id,${targets[kind]},reason,detail) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    [reporter, id, reason, detail],
  );
}
