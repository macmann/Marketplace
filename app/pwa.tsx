"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function Pwa({ install }: { install: string }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    const handle = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const installed = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", handle);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handle);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  return prompt ? (
    <button
      className="button secondary"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      {install}
    </button>
  ) : null;
}
