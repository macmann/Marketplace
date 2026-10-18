"use client";
import { useUi } from "./ui-provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const ui = useUi();
  return (
    <section className="wrap page empty">
      <h1>{ui("Something went wrong.")}</h1>
      <p>{ui("Please try again in a moment.")}</p>
      <button className="button primary" onClick={reset}>
        {ui("Try again")}
      </button>
    </section>
  );
}
