import Link from "next/link";
export default function NotFound() {
  return (
    <section className="wrap page empty">
      <h1>We couldn’t find that page.</h1>
      <Link className="button primary" href="/">
        Back to the marketplace →
      </Link>
    </section>
  );
}
