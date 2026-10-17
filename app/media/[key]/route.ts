import { getImage } from "@/lib/storage";
import { query } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(key))
    return new Response(null, { status: 404 });
  const [im] = await query(
    "SELECT l.status,l.seller_id,u.suspended FROM listing_images i JOIN listings l ON l.id=i.listing_id JOIN users u ON u.id=l.seller_id WHERE i.storage_key=$1",
    [key],
  );
  if (!im) return new Response(null, { status: 404 });
  if (!["ACTIVE", "RESERVED", "SOLD"].includes(im.status) || im.suspended) {
    const user = await currentUser();
    if (!user || (user.id !== im.seller_id && user.role !== "ADMIN"))
      return new Response(null, { status: 404 });
  }
  try {
    return new Response(new Uint8Array(await getImage(key)), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
