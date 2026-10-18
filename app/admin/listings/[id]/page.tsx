import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { uuid } from "@/lib/validation";
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("moderate");
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [l] = await query("SELECT * FROM listings WHERE id=$1", [id]);
  if (!l) notFound();
  const images = await query(
    "SELECT storage_key FROM listing_images WHERE listing_id=$1 ORDER BY position",
    [id],
  );
  return (
    <section className="wrap page narrow">
      <Link href="/admin">← Moderation queue</Link>
      <h1>{l.title}</h1>
      <p>{l.status}</p>
      <p className="prose">{l.description}</p>
      <p>
        {l.price} MMK · {l.category_id}
      </p>
      {images.map((i) => (
        <img
          key={i.storage_key}
          src={"/media/" + i.storage_key}
          width={500}
          height={400}
          alt={l.title}
        />
      ))}
    </section>
  );
}
