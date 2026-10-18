"use client";
import { useState } from "react";
export default function Alerts({
  enable,
  enabled,
  unavailable,
}: {
  enable: string;
  enabled: string;
  unavailable: string;
}) {
  const [status, setStatus] = useState("");
  return (
    <>
      <button
        className="button secondary"
        onClick={async () => {
          try {
            const p = await Notification.requestPermission();
            setStatus(p === "granted" ? enabled : unavailable);
          } catch {
            setStatus(unavailable);
          }
        }}
      >
        {enable}
      </button>
      <p role="status">{status}</p>
    </>
  );
}
