import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const u = await currentUser();
  if (!u)
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const [profile] = await query(
    "SELECT id,name,email,phone,phone_verified,created_at FROM users WHERE id=$1",
    [u.id],
  );
  const listings = await query("SELECT * FROM listings WHERE seller_id=$1", [
    u.id,
  ]);
  const listingAttributes = await query(
    "SELECT v.listing_id,v.attribute_id,a.name_en,a.name_my,a.type,v.value FROM listing_attribute_values v JOIN listings l ON l.id=v.listing_id JOIN category_attributes a ON a.id=v.attribute_id WHERE l.seller_id=$1",
    [u.id],
  );
  const drafts = await query(
    "SELECT * FROM listing_drafts WHERE seller_id=$1",
    [u.id],
  );
  const favorites = await query(
    "SELECT listing_id FROM favorites WHERE user_id=$1",
    [u.id],
  );
  const conversations = await query(
    "SELECT id,listing_id,created_at FROM conversations WHERE buyer_id=$1 OR seller_id=$1",
    [u.id],
  );
  const messages = await query(
    "SELECT m.id,m.conversation_id,m.sender_id,m.body,m.created_at,m.read_at FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.buyer_id=$1 OR c.seller_id=$1 ORDER BY m.created_at",
    [u.id],
  );
  const notifications = await query(
    "SELECT * FROM notifications WHERE user_id=$1",
    [u.id],
  );
  const reports = await query(
    "SELECT id,reason,detail,status,resolution,created_at,resolved_at FROM reports WHERE reporter_id=$1",
    [u.id],
  );
  return Response.json(
    {
      reports,
      notifications,
      exportedAt: new Date().toISOString(),
      profile,
      listings,
      listingAttributes,
      drafts,
      favorites,
      conversations,
      messages,
    },
    {
      headers: {
        "Content-Disposition": 'attachment; filename="neighbour-account.json"',
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
