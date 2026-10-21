import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HardHat,
  CalendarDays,
  Check,
  Compass,
} from "lucide-react";
import { Brand } from "@/components/ui";
import { DemoEntry } from "@/components/demo-entry";
import { BriefingForm } from "@/components/briefing-form";
export default function Home() {
  return (
    <div className="public-site">
      <header className="public-header">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#scouts">The three scouts</a>
          <a href="#pricing">Pricing</a>
          <Link href="/demo">Full demo</Link>
          <Link href="/sample" className="button secondary">
            View sample <ArrowRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="hero public-width">
          <div>
            <h1>Know what’s happening outside your hotel’s four walls.</h1>
            <p className="hero-tagline">
              Your hotel’s market research assistant.
            </p>
            <p className="hero-copy">
              Companies growing. Projects taking shape. Events bringing people
              together. SCOUT organizes the market activity that could matter to
              your hotel, so your team can decide what comes next.
            </p>
            <div className="hero-actions">
              <DemoEntry />
              <a className="text-link" href="#pricing">
                See the offer <ArrowRight size={17} />
              </a>
            </div>
            <p className="fine-print">
              Full demo uses isolated synthetic data saved in your browser. No
              live research or sending.
            </p>
          </div>
          <div className="sample-sheet">
            <div className="sheet-top">
              <Compass size={23} />
              <span>THE MARKET BLUEPRINT</span>
              <span className="sample-label">Fictional sample</span>
            </div>
            <h2>
              A clearer picture of
              <br />
              what’s around you.
            </h2>
            <div className="sample-item">
              <span className="tag corporate">Corporate</span>
              <h3>Alder Research Campus</h3>
              <p>New training wing and installation window announced.</p>
              <small>
                Lodging relevance: visiting specialists are possible; travel is
                unconfirmed.
              </small>
            </div>
            <div className="sample-item">
              <span className="tag project">Project</span>
              <h3>Northbank Bridge Renewal</h3>
              <p>Contractor named for the next phase of work.</p>
            </div>
            <div className="sample-item">
              <span className="tag event">Event</span>
              <h3>Harbor Youth Invitational</h3>
              <p>Three-day tournament dates updated.</p>
            </div>
            <div className="sheet-bottom">
              Evidence. Context. Unknowns.<span>One shared view.</span>
            </div>
          </div>
        </section>
        <section id="scouts" className="scouts-section">
          <div className="public-width">
            <div className="section-intro">
              <h2>
                Three scouts.
                <br />
                One local perspective.
              </h2>
              <p>
                A shared blueprint connects the companies, projects and events
                around your hotel. Each scout adds a different piece of the
                picture.
              </p>
            </div>
            <div className="scout-columns">
              {[
                {
                  icon: Building2,
                  title: "Corporate SCOUT",
                  text: "Local employers, facility expansions and training activity that may support recurring business travel.",
                  id: "corporate",
                },
                {
                  icon: HardHat,
                  title: "Project SCOUT",
                  text: "Construction, infrastructure and installations that may involve visiting crews and specialists.",
                  id: "project",
                },
                {
                  icon: CalendarDays,
                  title: "Event SCOUT",
                  text: "Tournaments, conferences and gatherings with potential overnight visitors.",
                  id: "event",
                },
              ].map((s) => (
                <article key={s.id}>
                  <s.icon size={29} strokeWidth={1.3} />
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <Link href={`/sample#${s.id}`} className="text-link">
                    View fictional examples <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="how-it-works" className="public-width process-section">
          <div className="section-intro">
            <h2>
              Less digging.
              <br />
              More understanding.
            </h2>
            <p>
              Intelligence for the sales tools and workflows you already use.
              Your team stays in control of strategy and outreach.
            </p>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Set the boundaries",
                "Confirm your hotel, geography, priorities and exclusions through assisted setup.",
              ],
              [
                "02",
                "Establish the blueprint",
                "Start with one organized view of relevant companies, projects and events.",
              ],
              [
                "03",
                "Keep the picture current",
                "Two update cycles weekly across all three scouts, focused on meaningful changes.",
              ],
              [
                "04",
                "Take it into your workflow",
                "Save what matters, copy a readable brief or export evidence and context to CSV.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Some cycles may have no meaningful changes. No daily lead quota,
            guaranteed bookings or automated outreach.
          </p>
        </section>
        <section id="pricing" className="pricing-section">
          <div className="public-width pricing-grid">
            <div>
              <h2>
                A focused service.
                <br />A straightforward offer.
              </h2>
              <div className="price">
                <strong>$99</strong>
                <span>assisted setup</span>
                <b>+</b>
                <strong>$50</strong>
                <span>/ month per hotel</span>
              </div>
              <p className="muted">
                Working launch offer · all three scouts included
              </p>
              <ul className="included">
                {[
                  "One initial market blueprint",
                  "Two update cycles weekly across all three scouts",
                  "Evidence, relevant dates and clearly stated unknowns",
                  "Saved findings, readable briefs and CSV exports",
                ].map((t) => (
                  <li key={t}>
                    <Check size={18} />
                    {t}
                  </li>
                ))}
              </ul>
              <p>
                Research quality and delivery costs are still to be validated in
                a live pilot. Payment and live service activation are not
                available in this demo.
              </p>
            </div>
            <BriefingForm />
          </div>
        </section>
        <section className="public-width faq-section">
          <h2>Useful intelligence. Clear limits.</h2>
          <details>
            <summary>Is this a CRM?</summary>
            <p>
              No. SCOUT supplies market intelligence you can take into your
              existing CRM, spreadsheets or documents. There are no pipeline
              stages, outreach tasks or automated messages.
            </p>
          </details>
          <details>
            <summary>Does a finding mean a company will book rooms?</summary>
            <p>
              No. A local presence or event is an observed fact only when
              supported by evidence. Lodging relevance is a separate assessment,
              with unknowns kept visible.
            </p>
          </details>
          <details>
            <summary>Are the demo findings real?</summary>
            <p>
              No. Every hotel, organization, project, event and source in the
              demo is fictional. No research, notification or scheduled job runs
              when you browse it.
            </p>
          </details>
        </section>
      </main>
      <footer className="public-footer public-width">
        <Brand />
        <p>Your hotel’s market research assistant.</p>
        <span>Fictional demonstration · Live service not activated</span>
      </footer>
    </div>
  );
}
