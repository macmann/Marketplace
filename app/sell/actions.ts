"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireAdmin, rateLimit } from "@/lib/auth";
import { listingService } from "@/lib/listing-service";
import { ListingError, type ListingPayload } from "@/lib/listing-validation";
import { listingCopy } from "@/lib/listing-i18n";
import { pool } from "@/lib/db";
import { uuid } from "@/lib/validation";
export type EditorResult = { error?: string };
export async function saveListing(
  _previous: EditorResult,
  f: FormData,
): Promise<EditorResult> {
  const u = await requireUser();
  const a = await listingCopy();
  let result;
  try {
    const kind = String(f.get("kind"));
    const mode = String(f.get("mode"));
    const id = String(f.get("id") ?? "");
    if (
      !["draft", "listing"].includes(kind) ||
      !["save", "publish"].includes(mode) ||
      (id && !uuid.safeParse(id).success)
    )
      throw new ListingError("invalid");
    await rateLimit("listing-write:" + u.id, 60, 3600);
    const uploads = f
      .getAll("photos")
      .filter((x): x is File => x instanceof File && x.size > 0);
    if (kind === "draft" && mode === "publish")
      await rateLimit("publish:" + u.id, 10, 86400);
    result = await listingService.save(u.id, {
      kind: kind as "draft" | "listing",
      id: id || undefined,
      revision: Number(f.get("revision")),
      mode: mode as "save" | "publish",
      payload: JSON.parse(String(f.get("payload"))) as ListingPayload,
      photoOrder: JSON.parse(String(f.get("photoOrder"))),
      uploads,
    });
  } catch (e) {
    return { error: e instanceof ListingError ? a[e.code] : a.invalid };
  }
  revalidatePath("/", "layout");
  if (result.kind === "draft")
    redirect("/sell/draft/" + result.id + "?saved=1");
  if (String(f.get("kind")) === "listing") redirect("/account/listings");
  redirect("/listing/" + result.id);
}
export async function discardDraft(f: FormData) {
  const u = await requireUser();
  const a = await listingCopy();
  try {
    const id = uuid.parse(f.get("id"));
    await listingService.discard(u.id, id, Number(f.get("revision")));
  } catch (e) {
    redirect(
      "/account/drafts?error=" +
        encodeURIComponent(e instanceof ListingError ? a[e.code] : a.invalid),
    );
  }
  revalidatePath("/account/drafts");
  redirect("/account/drafts?discarded=1");
}
export async function saveAttribute(f: FormData) {
  const u = await requireAdmin();
  const text = (k: string) => String(f.get(k) ?? "").trim();
  const a = await listingCopy();
  const category = text("category");
  const key = text("key");
  const type = text("type");
  const choices = text("choices")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const id = text("id");
  const en = text("en"),
    my = text("my");
  if (
    !/^[a-z][a-z0-9_]{0,49}$/.test(key) ||
    !en ||
    !my ||
    en.length > 100 ||
    my.length > 100 ||
    !["TEXT", "NUMBER", "BOOLEAN", "ENUM", "DATE"].includes(type) ||
    choices.length > 50 ||
    choices.some((x) => x.length > 100) ||
    new Set(choices).size !== choices.length ||
    (type === "ENUM" && !choices.length) ||
    (id && !uuid.safeParse(id).success)
  )
    redirect("/admin/attributes?error=" + encodeURIComponent(a.invalidConfig));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const valid = await client.query("SELECT id FROM categories WHERE id=$1", [
      category,
    ]);
    if (!valid.rowCount) throw Error();
    let row;
    if (id) {
      const r = await client.query(
        "UPDATE category_attributes SET name_en=$1,name_my=$2,choices=$3::jsonb,required=$4,enabled=$5,position=$6 WHERE id=$7 AND category_id=$8 AND key=$9 AND type=$10 RETURNING id",
        [
          en,
          my,
          JSON.stringify(type === "ENUM" ? choices : []),
          f.get("required") === "on",
          f.get("enabled") === "on",
          Math.max(0, Math.min(10000, Number(text("position")) || 0)),
          id,
          category,
          key,
          type,
        ],
      );
      row = r.rows[0];
    } else {
      const r = await client.query(
        "INSERT INTO category_attributes(category_id,key,name_en,name_my,type,choices,required,enabled,position) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) RETURNING id",
        [
          category,
          key,
          en,
          my,
          type,
          JSON.stringify(type === "ENUM" ? choices : []),
          f.get("required") === "on",
          f.get("enabled") === "on",
          Math.max(0, Math.min(10000, Number(text("position")) || 0)),
        ],
      );
      row = r.rows[0];
    }
    if (!row) throw Error();
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_id) VALUES($1,'ATTRIBUTE_UPDATED',$2)",
      [u.id, row.id],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    redirect("/admin/attributes?error=" + encodeURIComponent(a.invalidConfig));
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
  redirect("/admin/attributes?saved=1");
}
