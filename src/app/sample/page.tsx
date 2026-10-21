import Link from "next/link";
import { Brand, CategoryTag } from "@/components/ui";
import { publicSample } from "@/lib/public-sample";
export const metadata = {
  title: "Fictional market blueprint sample | SCOUT",
  description:
    "A clearly labeled fictional example of SCOUT evidence, lodging relevance and unknowns. No live research or customer results.",
};
export default function SamplePage() {
  return (
    <div className="public-site">
      <header className="public-header">
        <Brand />
        <Link className="text-link" href="/">
          About the service
        </Link>
      </header>
      <main id="main" className="public-width" style={{ paddingBlock: 48 }}>
        <span className="eyebrow">
          FICTIONAL SAMPLE · NOT VERIFIED RESEARCH
        </span>
        <h1>What your market blueprint can look like.</h1>
        <p>
          Three perspectives, with facts, possible lodging relevance and
          unanswered questions kept separate. These invented examples explain
          the format. They are not leads, real companies or proof of customer
          results.
        </p>
        <p>
          <a className="button primary" href="/sample/export">
            Download fictional sample CSV
          </a>
        </p>
        <p className="fine-print">
          No account required. This download contains only bundled fictional
          examples; it never reads a hotel workspace or starts research.
        </p>
        {publicSample.map((f) => (
          <article
            className="panel coverage-editor"
            key={f.id}
            style={{ marginBlock: 24 }}
          >
            <CategoryTag category={f.category} />
            <h2>{f.title}</h2>
            <h3>Sample observed fact</h3>
            <p>{f.summary}</p>
            <p>
              {f.location} · {f.status} · {f.start ?? "Start unknown"} to{" "}
              {f.end ?? "End unknown"}
            </p>
            <h3>Potential lodging relevance</h3>
            <p>{f.inference}</p>
            <h3>Still unknown</h3>
            <ul>
              {f.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <h3>Evidence example</h3>
            {f.evidence.map((e) => (
              <div key={e.id}>
                <p>{e.claim}</p>
                <p className="fine-print">
                  Fictional publisher: {e.publisher}. Publication:{" "}
                  {e.publishedAt ?? "Unknown"}. Retrieval: {e.retrievedAt}. Live
                  verification: none.
                </p>
                <p className="fine-print" style={{ overflowWrap: "anywhere" }}>
                  {e.url} — illustrative source address, not a verified source.
                </p>
              </div>
            ))}
            <h3>What changed</h3>
            <p>{f.versions.at(-1)?.summary}</p>
          </article>
        ))}
        <h2>Keep using the sales tools you know.</h2>
        <p>
          Export the intelligence to your spreadsheet or CRM. A saved finding is
          a research preference, not an opportunity or an outreach action.
          Nothing is sent automatically.
        </p>
        <Link href="/demo" className="button secondary">
          Explore the fictional workspace
        </Link>
      </main>
      <footer className="public-footer public-width">
        <Brand />
        <p>
          Live service activation remains unavailable. No purchase or payment is
          taken.
        </p>
      </footer>
    </div>
  );
}
