import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { emptyPayload } from "@/lib/listing-validation";
import Editor from "../../editor";
export default async function Draft({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [u, { id }, p] = await Promise.all([
    requireUser(),
    params,
    searchParams,
  ]);
  if (!uuid.safeParse(id).success) notFound();
  const [draft] = await query(
    "SELECT * FROM listing_drafts WHERE id=$1 AND seller_id=$2",
    [id, u.id],
  );
  if (!draft) notFound();
  const images = await query(
    "SELECT id,storage_key FROM listing_images WHERE draft_id=$1 ORDER BY position",
    [id],
  );
  return (
    <Editor
      id={id}
      kind="draft"
      revision={draft.revision}
      initial={{ ...emptyPayload, ...draft.payload }}
      images={images as { id: string; storage_key: string }[]}
      saved={!!p.saved}
      verified={u.phone_verified}
    />
  );
}
