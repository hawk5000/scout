import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HardHat,
  CalendarDays,
  Check,
  Compass,
  Binoculars,
  Newspaper,
  FileText,
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
          <a href="#scouts">What SCOUT follows</a>
          <a href="#pricing">Pricing</a>
          <Link href="/demo">Full demo</Link>
          <Link href="/app">Customer sign-in</Link>
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
              Companies growing. Projects taking shape. Events, selected
              competitors and public mentions of your hotel. SCOUT brings the
              evidence, dates, lodging context and open questions together, so
              your team can decide what comes next.
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
            <div className="sample-item">
              <span className="tag neutral">Selected competitor</span>
              <h3>Harbor Point Hotel</h3>
              <p>Fictional renovation announcement, dated and source-linked.</p>
            </div>
            <div className="sample-item">
              <span className="tag neutral">Your hotel</span>
              <h3>Willow House Hotel</h3>
              <p>Fictional public mention, matched to the hotel identity.</p>
            </div>
            <div className="briefing-preview">
              <FileText size={17} />
              <span>
                <strong>SCOUT Briefing</strong>
                <small>
                  Evidence, practical implications and what remains unknown.
                </small>
              </span>
            </div>
            <div className="sheet-bottom">
              Five research views.<span>One clear briefing.</span>
            </div>
          </div>
        </section>
        <section id="scouts" className="scouts-section">
          <div className="public-width">
            <div className="section-intro">
              <h2>
                Five research views.
                <br />
                One hotel perspective.
              </h2>
              <p>
                Follow the activity around your hotel and keep observed facts,
                lodging relevance and unknowns easy to tell apart. The first
                three views build the prospecting foundation; two more focus on
                your selected competitors and your own property.
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
                {
                  icon: Binoculars,
                  title: "Competitor SCOUT",
                  text: "Noteworthy public changes at the specific hotels you choose to follow, with dates and evidence.",
                  id: "competitor",
                },
                {
                  icon: Newspaper,
                  title: "Property SCOUT",
                  text: "Public mentions of your hotel, checked against its name and aliases to avoid lookalike matches.",
                  id: "property",
                },
                {
                  icon: FileText,
                  title: "SCOUT Briefing",
                  text: "A source-linked view across all five categories, with practical implications and open questions.",
                  id: "briefing",
                },
              ].map((s) => (
                <article key={s.id}>
                  <s.icon size={29} strokeWidth={1.3} />
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {s.id === "corporate" ||
                  s.id === "project" ||
                  s.id === "event" ? (
                    <Link href={`/sample#${s.id}`} className="text-link">
                      View fictional example <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <span className="text-link">
                      Included in the expanded workspace
                    </span>
                  )}
                </article>
              ))}
            </div>
            <p className="fine-print expansion-note">
              The public sample and full demo use fictional data and currently
              show the original three prospecting categories. Competitor and
              hotel-mention refreshes are isolated synthetic previews; live
              research is not active.
            </p>
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
                "Confirm your hotel identity, market area and the hotels you want to follow.",
              ],
              [
                "02",
                "Establish the blueprint",
                "Build one organized view across companies, projects, events, selected competitors and public mentions of your hotel.",
              ],
              [
                "03",
                "Keep the picture current",
                "The planned service cadence is two shared weekly updates across all five research views. No schedule is active in this demo.",
              ],
              [
                "04",
                "Take it into your workflow",
                "Review proposed findings, then save, copy or export useful evidence and context to your existing sales tools.",
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
          <p className="fine-print">
            The isolated synthetic pilot stages proposed findings for an
            explicit review before publication. Live research, paid provider
            access, schedules and notifications remain disabled.
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
                Launch offer · five research views and SCOUT Briefing
              </p>
              <ul className="included">
                {[
                  "One initial market blueprint across five research views",
                  "Two shared weekly update cycles planned across all five views",
                  "Selected competitor changes and public mentions of your hotel",
                  "Source-linked SCOUT Briefing, saved findings and CSV exports",
                ].map((t) => (
                  <li key={t}>
                    <Check size={18} />
                    {t}
                  </li>
                ))}
              </ul>
              <p>
                Research quality and delivery costs still need live-pilot
                validation. Research, payment and service activation are not
                available in this demo.
              </p>
            </div>
            <BriefingForm />
          </div>
        </section>
        <section className="public-width faq-section">
          <h2>Useful intelligence. Clear limits.</h2>
          <details>
            <summary>What goes into the SCOUT Briefing?</summary>
            <p>
              The planned briefing brings relevant findings from companies,
              projects, events, selected competitors and public mentions of your
              hotel into one source-linked view. It separates observed facts
              from possible lodging relevance and calls out what remains
              unknown.
            </p>
          </details>
          <details>
            <summary>Are new findings published automatically?</summary>
            <p>
              The isolated synthetic pilot holds proposed findings for explicit
              review before publication. Live research and publication are not
              active in the customer service yet.
            </p>
          </details>
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
