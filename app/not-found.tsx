import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
export default async function NotFound() {
  const ui = await uiCopy();

  return (
    <section className="wrap page empty">
      <h1>{ui("We couldn’t find that page.")}</h1>
      <Link className="button primary" href="/">
        {ui("Back to the marketplace →")}
      </Link>
    </section>
  );
}
