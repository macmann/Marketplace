"use client";
import { useEffect, useRef, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function Pwa({
  install,
  lang,
}: {
  install: string;
  lang: string;
}) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const my = lang === "my";
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    const handle = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const mode = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(
        mode.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    update();
    const onInstalled = () => {
      setPrompt(null);
      setInstalled(true);
      dialog.current?.close();
    };
    window.addEventListener("beforeinstallprompt", handle);
    window.addEventListener("appinstalled", onInstalled);
    mode.addEventListener("change", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", handle);
      window.removeEventListener("appinstalled", onInstalled);
      mode.removeEventListener("change", update);
    };
  }, []);
  if (installed) return null;
  return (
    <>
      <button
        type="button"
        className="button secondary install-button"
        aria-label={install}
        title={install}
        disabled={busy}
        onClick={async () => {
          if (!prompt) {
            dialog.current?.showModal();
            return;
          }
          const event = prompt;
          setPrompt(null);
          setBusy(true);
          try {
            await event.prompt();
            const choice = await event.userChoice;
            if (choice.outcome === "accepted") setInstalled(true);
          } catch {
            dialog.current?.showModal();
          } finally {
            setBusy(false);
          }
        }}
      >
        <span aria-hidden="true">↓</span> {my ? "အက်ပ် ထည့်ရန်" : "Install app"}
      </button>
      <dialog
        ref={dialog}
        className="install-dialog"
        aria-labelledby="install-heading"
      >
        <h2 id="install-heading">{install}</h2>
        <p>
          {my
            ? "Neighbour ကို ပင်မမျက်နှာပြင်တွင် ထည့်ပြီး အက်ပ်ကဲ့သို့ ဖွင့်နိုင်ပါသည်။"
            : "Add Neighbour to your home screen or apps for quick access."}
        </p>
        <ul>
          <li>
            <strong>iPhone / iPad:</strong>{" "}
            {my
              ? "Safari တွင် ဖွင့်ပါ။ Share → Add to Home Screen → Add ကို နှိပ်ပါ။"
              : "Open in Safari. Tap Share → Add to Home Screen → Add."}
          </li>
          <li>
            <strong>Android:</strong>{" "}
            {my
              ? "Chrome မီနူး (⋮) → Install app သို့မဟုတ် Add to Home screen ကို နှိပ်ပါ။"
              : "In Chrome, open the menu (⋮) → Install app or Add to Home screen."}
          </li>
          <li>
            <strong>{my ? "ကွန်ပျူတာ:" : "Computer:"}</strong>{" "}
            {my
              ? "Chrome သို့မဟုတ် Edge တွင် လိပ်စာဘားရှိ Install သင်္ကေတ သို့မဟုတ် ဘရောက်ဇာမီနူးကို သုံးပါ။ Safari တွင် File → Add to Dock ကို သုံးပါ။"
              : "In Chrome or Edge, use the install icon in the address bar or browser menu. In Safari, use File → Add to Dock."}
          </li>
        </ul>
        <p>
          {my
            ? "အခြားအက်ပ်အတွင်းမှ ဖွင့်ထားပါက မီနူးမှ Open in browser ကို အရင်ရွေးပါ။ ရွေးချယ်စရာများသည် ဘရောက်ဇာနှင့် စက်ပေါ်မူတည်ပါသည်။"
            : "If you opened this inside another app, choose Open in browser first. Available options depend on your browser and device."}
        </p>
        <form method="dialog">
          <button className="button primary" autoFocus>
            {my ? "ပိတ်မည်" : "Close"}
          </button>
        </form>
      </dialog>
    </>
  );
}
