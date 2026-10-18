import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import { currentUser } from "@/lib/auth";
import { locale, translations } from "@/lib/i18n";
import { language, logout } from "./actions";
import "./globals.css";
import { UiProvider } from "./ui-provider";
import { uiCopy } from "@/lib/ui-i18n";
import Pwa from "./pwa";
import LiveNotifications from "./live-notifications";
import { releaseCopy } from "@/lib/release-i18n";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Neighbour by Flash Tech · Buy. Sell. Give away.",
    template: "%s · Neighbour by Flash Tech",
  },
  description: "Find useful things near you. A local marketplace for Myanmar.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#224c3b",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, lang, u] = await Promise.all([
    translations(),
    locale(),
    currentUser(),
  ]);
  const r = await releaseCopy();
  const ui = await uiCopy();
  return (
    <html lang={lang} data-scroll-behavior="smooth">
      <body>
        <UiProvider locale={lang}>
          <a className="skip" href="#main">
            {ui("Skip to content")}
          </a>
          <header>
            <div className="topbar wrap">
              <Link className="brand" href="/">
                <span className="brand-icon">
                  n<span>•</span>
                </span>
                <span className="brand-wordmark">
                  <span>{t.brand}</span>
                  <small className="brand-attribution">
                    by
                    <Image
                      src="/flash-tech-wordmark.svg"
                      alt="Flash Tech"
                      width={96}
                      height={12}
                    />
                  </small>
                </span>
              </Link>
              <nav aria-label={ui("Main navigation")}>
                <Link href="/">{t.home}</Link>
                <Link href="/free">{t.free}</Link>
                {u && (
                  <LiveNotifications
                    key={u.id}
                    label={r.notifications}
                    newMessage={r.newMessage}
                  />
                )}
                <form action={language}>
                  <button className="language" type="submit">
                    ◎ {t.language}
                  </button>
                </form>
                <Link href={u ? "/account" : "/login"}>
                  {u ? t.account : t.login}
                </Link>
                <Link className="button primary compact" href="/sell">
                  ＋ {t.sell}
                </Link>
                <Pwa install={r.install} lang={lang} />
              </nav>
            </div>
          </header>
          <main id="main">{children}</main>
          <footer className="wrap">
            <div>
              <Link className="brand" href="/">
                <span className="brand-wordmark">
                  <span>{t.brand}</span>
                  <small className="brand-attribution">
                    by
                    <Image
                      src="/flash-tech.svg"
                      alt="Flash Tech"
                      width={230}
                      height={80}
                    />
                  </small>
                </span>
              </Link>
              <p>{t.about}</p>
              <Link href="/safety">{r.safety}</Link>
            </div>
            <div>
              <strong>{t.tagline}</strong>
              <p>{t.footer}</p>
              {u && (
                <form action={logout}>
                  <button className="text-button">{t.logout}</button>
                </form>
              )}
            </div>
          </footer>
          <div className="mobile-nav">
            <Link href="/">
              ⌂<span>{t.home}</span>
            </Link>
            <Link href="/account/favorites">
              ♡<span>{t.saved}</span>
            </Link>
            <Link href="/sell">
              ＋<span>{t.sell}</span>
            </Link>
            <Link href="/account/messages">
              ▤<span>{t.messages}</span>
            </Link>
          </div>
        </UiProvider>
      </body>
    </html>
  );
}
