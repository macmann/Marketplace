"use client";
import { useEffect, useState } from "react";
import { pushConfiguration, subscribePush, unsubscribePush } from "./actions";
export default function Push() {
  const [key, setKey] = useState(""),
    [enabled, setEnabled] = useState(false),
    [status, setStatus] = useState("");
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      pushConfiguration().then((k) => setKey(k));
      navigator.serviceWorker.ready
        .then((r) => r.pushManager.getSubscription())
        .then((s) => setEnabled(Boolean(s)));
    }
  }, []);
  if (!key) return null;
  return (
    <div className="panel">
      <p>
        Receive notifications when Neighbour is closed. Message contents are
        kept private.
      </p>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            const registration = await navigator.serviceWorker.ready;
            if (enabled) {
              const s = await registration.pushManager.getSubscription();
              if (s) {
                await unsubscribePush(s.endpoint);
                await s.unsubscribe();
              }
              setEnabled(false);
              setStatus("Push notifications disabled.");
            } else {
              const bytes = Uint8Array.from(
                atob(key.replace(/-/g, "+").replace(/_/g, "/")),
                (c) => c.charCodeAt(0),
              );
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: bytes,
              });
              await subscribePush(subscription.toJSON());
              setEnabled(true);
              setStatus("Push notifications enabled.");
            }
          } catch {
            setStatus(
              "Push notifications could not be changed. Check browser permissions and try again.",
            );
          }
        }}
      >
        {enabled ? "Disable push notifications" : "Enable push notifications"}
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
