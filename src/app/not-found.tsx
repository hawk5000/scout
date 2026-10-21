import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="access-page">
      <h1>This page is off the map.</h1>
      <p>The requested page could not be found.</p>
      <Link href="/" className="button primary">
        Return to SCOUT
      </Link>
    </main>
  );
}
