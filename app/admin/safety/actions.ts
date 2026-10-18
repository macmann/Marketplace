"use server";
import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uuid } from "@/lib/validation";
export async function safetySettings(f: FormData) {
  const u = await requireAdmin();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const phrase = String(f.get("phrase") ?? "")
      .normalize("NFC")
      .trim()
      .toLowerCase();
    if (f.get("rule"))
      await c.query(
        "UPDATE moderation_rules SET enabled=NOT enabled WHERE id=$1",
        [uuid.parse(f.get("rule"))],
      );
    else if (phrase) {
      if (phrase.length < 2 || phrase.length > 100)
        throw Error("Phrase must be 2–100 characters");
      await c.query(
        "INSERT INTO moderation_rules(phrase) VALUES($1) ON CONFLICT(phrase) DO UPDATE SET enabled=true",
        [phrase],
      );
    } else
      await c.query(
        "UPDATE marketplace_settings SET review_all=$1 WHERE id=true",
        [f.get("review_all") === "on"],
      );
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id,detail) VALUES($1,'SAFETY_POLICY','settings',$2)",
      [u.id, phrase || String(f.get("rule") ?? "Review policy updated")],
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    redirect(
      "/admin/safety?error=" +
        encodeURIComponent(e instanceof Error ? e.message : "Update failed"),
    );
  } finally {
    c.release();
  }
  revalidatePath("/admin/safety");
}
export async function changeRole(f: FormData) {
  const actor = await requireAdmin();
  const id = uuid.parse(f.get("id")),
    role = String(f.get("role"));
  if (!["USER", "SUPPORT", "MODERATOR", "ADMIN"].includes(role)) return;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(742903)");
    const {
      rows: [a],
    } = await c.query(
      "SELECT role FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL FOR SHARE",
      [actor.id],
    );
    if (a?.role !== "ADMIN") throw Error("Forbidden");
    const {
      rows: [u],
    } = await c.query(
      "SELECT role FROM users WHERE id=$1 AND NOT suspended AND deleted_at IS NULL FOR UPDATE",
      [id],
    );
    if (!u) throw Error("Account unavailable");
    if (u.role === "ADMIN" && role !== "ADMIN") {
      const other = await c.query(
        "SELECT 1 FROM users WHERE role='ADMIN' AND id<>$1 AND NOT suspended AND deleted_at IS NULL",
        [id],
      );
      if (!other.rowCount)
        throw Error("The last administrator cannot be demoted");
    }
    await c.query("UPDATE users SET role=$1 WHERE id=$2", [role, id]);
    await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    await c.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id,detail) VALUES($1,'ROLE_CHANGED',$2,$3)",
      [actor.id, id, u.role + " → " + role],
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    redirect(
      "/admin/safety?error=" +
        encodeURIComponent(e instanceof Error ? e.message : "Update failed"),
    );
  } finally {
    c.release();
  }
  revalidatePath("/admin/safety");
}
