import { cookies } from "next/headers";
import { digest, rateLimit } from "@/lib/auth";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = (await cookies()).get("market_session")?.value;
  if (!token)
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  const session = digest(token);
  const valid = await query(
    "SELECT u.id FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.suspended AND u.deleted_at IS NULL",
    [session],
  );
  if (!valid.length)
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    await rateLimit("events:" + valid[0].id, 60, 60);
  } catch {
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    });
  }
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  const stop = () => {
    closed = true;
    if (timer) clearTimeout(timer);
    wake?.();
  };
  request.signal.addEventListener("abort", stop, { once: true });
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const deadline = Date.now() + 55000;
      try {
        while (!closed && Date.now() < deadline) {
          const [state] = await query(
            `SELECT
      (SELECT count(*) FROM notifications n WHERE n.user_id=u.id AND n.read_at IS NULL) unread,
      (SELECT max(n.created_at) FROM notifications n WHERE n.user_id=u.id) latest,
      (SELECT max(l.updated_at) FROM listings l WHERE l.seller_id=u.id) listings_updated,
      (SELECT max(m.read_at) FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.buyer_id=u.id OR c.seller_id=u.id) receipts
      FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.suspended AND u.deleted_at IS NULL`,
            [session],
          );
          if (!state) break;
          if (!closed)
            controller.enqueue(
              encoder.encode("data: " + JSON.stringify(state) + "\n\n"),
            );
          await new Promise<void>((resolve) => {
            wake = resolve;
            timer = setTimeout(resolve, 3000);
            if (closed) resolve();
          });
        }
      } catch {
        /* Reconnect without exposing database or session details. */
      } finally {
        stop();
        request.signal.removeEventListener("abort", stop);
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, private, no-transform",
      "Content-Encoding": "identity",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
