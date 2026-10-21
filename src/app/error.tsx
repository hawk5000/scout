"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="access-page">
      <h1>We couldn’t load this view.</h1>
      <p>Your saved demo data has not been reset.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
