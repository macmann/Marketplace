import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { emptyPayload } from "@/lib/listing-validation";
import Editor from "../editor";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [u, { id }] = await Promise.all([requireUser(), params]);
  if (!uuid.safeParse(id).success) notFound();
  const [l] = await query(
    "SELECT * FROM listings WHERE id=$1 AND seller_id=$2 AND status IN ('ACTIVE','RESERVED','DRAFT','EXPIRED')",
    [id, u.id],
  );
  if (!l) notFound();
  const images = await query(
    "SELECT id,storage_key FROM listing_images WHERE listing_id=$1 ORDER BY position",
    [id],
  );
  const attrs = await query(
    "SELECT attribute_id,value FROM listing_attribute_values WHERE listing_id=$1",
    [id],
  );
  return (
    <Editor
      id={id}
      kind="listing"
      revision={l.revision}
      initial={{
        ...emptyPayload,
        title: l.title,
        description: l.description,
        category: l.category_id,
        location: l.location_id,
        type: l.listing_type,
        price: String(l.price),
        condition: l.condition,
        attributes: Object.fromEntries(
          attrs.map((r) => [r.attribute_id, String(r.value)]),
        ),
      }}
      images={images as { id: string; storage_key: string }[]}
      verified={u.phone_verified}
    />
  );
}
