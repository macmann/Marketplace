"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
export default function LiveNotifications({
  label,
  newMessage,
}: {
  label: string;
  newMessage: string;
}) {
  const [unread, setUnread] = useState(0);
  const router = useRouter(),
    path = usePathname();
  useEffect(() => {
    let source: EventSource | undefined,
      previous: string | undefined,
      latest: string | undefined;
    const connect = () => {
      if (document.visibilityState !== "visible") return;
      source = new EventSource("/api/events");
      source.onmessage = (e) => {
        const state = JSON.parse(e.data);
        setUnread(Number(state.unread));
        if (previous !== undefined && previous !== e.data) {
          if (
            state.latest &&
            state.latest !== latest &&
            Number(state.unread) > 0 &&
            "Notification" in window &&
            Notification.permission === "granted"
          )
            new Notification(label, {
              tag: "neighbour-inbox",
            });
          if (
            path.startsWith("/account/messages") ||
            path.startsWith("/account/notifications") ||
            path.startsWith("/account/listings")
          )
            router.refresh();
        }
        previous = e.data;
        latest = state.latest;
      };
    };
    const visibility = () => {
      source?.close();
      if (document.visibilityState === "visible") {
        router.refresh();
        connect();
      }
    };
    connect();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      source?.close();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [router, path, label, newMessage]);
  return (
    <Link href="/account/notifications">
      {label}
      {unread > 0 && (
        <span className="notification-count" aria-label={String(unread)}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
