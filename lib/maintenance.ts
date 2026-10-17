import { pool, query } from "./db";
import { deleteImage } from "./storage";
export async function maintenance() {
  await query(
    "UPDATE listings SET status='EXPIRED',updated_at=now() WHERE status='ACTIVE' AND expires_at<now()",
  );
  await query("DELETE FROM sessions WHERE expires_at<now()");
  await query("DELETE FROM rate_limits WHERE reset_at<now()-interval '1 day'");
  await query(
    "DELETE FROM auth_challenges WHERE expires_at<now() OR consumed_at IS NOT NULL",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT storage_key FROM image_deletions ORDER BY attempts,created_at LIMIT 100 FOR UPDATE SKIP LOCKED",
    );
    for (const r of rows) {
      try {
        await deleteImage(r.storage_key);
        await client.query("DELETE FROM image_deletions WHERE storage_key=$1", [
          r.storage_key,
        ]);
      } catch {
        await client.query(
          "UPDATE image_deletions SET attempts=attempts+1 WHERE storage_key=$1",
          [r.storage_key],
        );
        console.error(JSON.stringify({ event: "image_deletion_failed" }));
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
