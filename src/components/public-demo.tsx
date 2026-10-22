"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bookmark,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  FileSearch,
  Hotel,
  MapPin,
  Menu,
  MessageSquareText,
  Search,
  X,
} from "lucide-react";
import {
  publicDemoBriefing,
  publicDemoCategories,
  publicDemoCsv,
  publicDemoFindings,
  type PublicDemoCategory,
  type PublicDemoFinding,
} from "@/lib/public-demo";

const stateKey = "scout-public-fictional-demo-v1";
const navigation = [
  { href: "/demo", label: "Overview", icon: Hotel },
  { href: "/demo/blueprint", label: "Market Blueprint", icon: FileSearch },
  { href: "/demo/competitors", label: "Competitors", icon: Building2 },
  { href: "/demo/property", label: "Hotel mentions", icon: MessageSquareText },
  { href: "/demo/briefing", label: "SCOUT Briefing", icon: ClipboardList },
  { href: "/demo/updates", label: "Updates", icon: CalendarDays },
];

type PreferenceState = { saved: string[]; dismissed: string[] };

export function PublicDemoApp() {
  const pathname = usePathname();
  const [prefs, setPrefs] = useState<PreferenceState>({
    saved: [],
    dismissed: [],
  });
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | PublicDemoCategory>("All");
  const [status, setStatus] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(stateKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PreferenceState>;
        const knownIds = new Set(
          publicDemoFindings.map((finding) => finding.id),
        );
        setPrefs({
          saved: Array.isArray(parsed.saved)
            ? [
                ...new Set(
                  parsed.saved.filter(
                    (x): x is string =>
                      typeof x === "string" && knownIds.has(x),
                  ),
                ),
              ]
            : [],
          dismissed: Array.isArray(parsed.dismissed)
            ? [
                ...new Set(
                  parsed.dismissed.filter(
                    (x): x is string =>
                      typeof x === "string" && knownIds.has(x),
                  ),
                ),
              ]
            : [],
        });
      }
    } catch {
      // A malformed or unavailable browser-only demo preference store is ignored.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setStatus("");
  }, [pathname]);

  function savePrefs(next: PreferenceState) {
    setPrefs(next);
    try {
      localStorage.setItem(stateKey, JSON.stringify(next));
    } catch {
      setStatus(
        "Browser storage is unavailable; this change may not persist after you leave.",
      );
    }
  }

  function toggleSaved(finding: PublicDemoFinding) {
    const saved = prefs.saved.includes(finding.id)
      ? prefs.saved.filter((id) => id !== finding.id)
      : [...prefs.saved, finding.id];
    savePrefs({ ...prefs, saved });
    setStatus(
      saved.includes(finding.id)
        ? "Saved in this browser."
        : "Removed from saved findings.",
    );
  }

  function toggleDismissed(finding: PublicDemoFinding) {
    const dismissed = prefs.dismissed.includes(finding.id)
      ? prefs.dismissed.filter((id) => id !== finding.id)
      : [...prefs.dismissed, finding.id];
    savePrefs({ ...prefs, dismissed });
    setStatus(
      dismissed.includes(finding.id)
        ? "Hidden from this browser’s active findings."
        : "Finding restored.",
    );
  }

  async function copyFinding(finding: PublicDemoFinding) {
    const text = `${finding.title}\n${finding.category} · ${finding.location}\n${finding.dateLabel}\n\n${finding.summary}\n\nWhy it may matter: ${finding.relevance}\n\nUnknown: ${finding.unknowns.join("; ")}\n\nFictional source: ${finding.source.label} (${finding.source.url})`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Fictional finding copied.");
    } catch {
      setStatus("Clipboard access is unavailable in this browser.");
    }
  }

  function exportFindings(findings: PublicDemoFinding[]) {
    const blob = new Blob(["\ufeff", publicDemoCsv(findings)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SCOUT-fictional-market-blueprint.csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Fictional sample exported as CSV.");
  }

  const activeFindings = useMemo(
    () =>
      publicDemoFindings.filter(
        (finding) => !prefs.dismissed.includes(finding.id),
      ),
    [prefs.dismissed],
  );
  const segments = pathname.replace(/^\/demo\/?/, "");
  const detail = segments.startsWith("findings/")
    ? publicDemoFindings.find(
        (item) => item.id === segments.slice("findings/".length),
      )
    : undefined;
  const page = segments || "overview";
  const current = navigation.find((item) => item.href === pathname);
  const queryFindings = (findings: PublicDemoFinding[]) =>
    findings.filter((finding) => {
      const matchesQuery =
        `${finding.title} ${finding.category} ${finding.location} ${finding.summary}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCategory =
        category === "All" || finding.category === category;
      return matchesQuery && matchesCategory;
    });

  let title = "A clearer picture of what’s around you.";
  let subtitle =
    "Local activity, competitor changes and public hotel mentions—organized around useful findings.";
  let content: ReactNode;

  if (detail) {
    title = detail.title;
    subtitle = `${detail.category} · ${detail.location}`;
    content = (
      <FindingDetail
        finding={detail}
        saved={prefs.saved.includes(detail.id)}
        dismissed={prefs.dismissed.includes(detail.id)}
        onSave={() => toggleSaved(detail)}
        onDismiss={() => toggleDismissed(detail)}
        onCopy={() => void copyFinding(detail)}
      />
    );
  } else if (page === "briefing") {
    title = "A sample briefing for your hotel.";
    subtitle =
      "An example of how SCOUT connects evidence to practical implications and the questions still to confirm.";
    content = (
      <Briefing
        onOpen={(id) => (window.location.href = `/demo/findings/${id}`)}
      />
    );
  } else if (page === "competitors" || page === "property") {
    const selectedCategory = page === "competitors" ? "Competitor" : "Property";
    const findings = activeFindings.filter(
      (item) => item.category === selectedCategory,
    );
    title =
      page === "competitors"
        ? "Nearby hotel changes."
        : "Public mentions of your hotel.";
    subtitle =
      page === "competitors"
        ? "Follow noteworthy changes at the competitors selected for a hotel’s local market. This sample follows one fictional hotel."
        : "See public mentions with source dates and transparent identity context. A single mention never implies a trend.";
    content = (
      <>
        <div className="public-demo-callout">
          <strong>
            {page === "competitors"
              ? "Selected competitor in this sample"
              : "Hotel identity context in this sample"}
          </strong>
          <p>
            {page === "competitors"
              ? "Harbor Ridge Hotel is the one fictional hotel in Willow House Hotel’s illustrative comp set. No other hotels are being monitored."
              : "The fictional mention is matched to Willow House Hotel by the sample name and reserved .example identity. This is not a real identity check."}
          </p>
        </div>
        <FindingList
          findings={findings}
          saved={prefs.saved}
          dismissed={prefs.dismissed}
          onSave={toggleSaved}
          onDismiss={toggleDismissed}
          onCopy={copyFinding}
          onExport={() => exportFindings(findings)}
        />
      </>
    );
  } else if (page === "saved") {
    title = "Saved findings.";
    subtitle = "A short list to take into your existing sales tools.";
    content = (
      <FindingList
        findings={publicDemoFindings.filter(
          (item) =>
            prefs.saved.includes(item.id) && !prefs.dismissed.includes(item.id),
        )}
        saved={prefs.saved}
        dismissed={prefs.dismissed}
        onSave={toggleSaved}
        onDismiss={toggleDismissed}
        onCopy={copyFinding}
        onExport={() =>
          exportFindings(
            publicDemoFindings.filter((item) => prefs.saved.includes(item.id)),
          )
        }
      />
    );
  } else if (page === "updates") {
    title = "What changed in this sample.";
    subtitle =
      "Updates are shown as dated findings, with evidence and what still needs confirmation.";
    content = (
      <>
        <div className="public-demo-callout">
          <strong>Example update history</strong>
          <p>
            These dates describe fictional fixture records only. No current scan
            or scheduled research has run. Dismissed examples remain available
            here and can be restored.
          </p>
        </div>
        <FindingList
          findings={[...publicDemoFindings].reverse()}
          saved={prefs.saved}
          dismissed={prefs.dismissed}
          onSave={toggleSaved}
          onDismiss={toggleDismissed}
          onCopy={copyFinding}
          onExport={() => exportFindings(publicDemoFindings)}
        />
      </>
    );
  } else if (page === "blueprint") {
    title = "The Market Blueprint.";
    subtitle =
      "Search across local companies, projects, events, selected competitors and mentions of your hotel.";
    content = (
      <>
        <FilterBar
          query={query}
          category={category}
          setQuery={setQuery}
          setCategory={setCategory}
        />
        <FindingList
          findings={queryFindings(activeFindings)}
          saved={prefs.saved}
          dismissed={prefs.dismissed}
          onSave={toggleSaved}
          onDismiss={toggleDismissed}
          onCopy={copyFinding}
          onExport={() => exportFindings(queryFindings(activeFindings))}
        />
      </>
    );
  } else {
    content = (
      <Overview findings={activeFindings} savedCount={prefs.saved.length} />
    );
  }

  return (
    <div className="public-demo-shell">
      <aside className={`public-demo-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link
          href="/demo"
          className="public-demo-brand"
          aria-label="SCOUT demo home"
        >
          <img
            src="/brand/scout-main.webp"
            width={864}
            height={576}
            alt="SCOUT by SalesHospitality"
          />
        </Link>
        <div className="public-demo-hotel">
          <span className="public-demo-eyebrow">FICTIONAL DEMO HOTEL</span>
          <strong>Willow House Hotel</strong>
          <span>
            <MapPin size={14} /> Demo Harbor, Washington
          </span>
        </div>
        <nav aria-label="Demo workspace">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href || (href === "/demo/blueprint" && detail)
                  ? "active"
                  : ""
              }
            >
              <Icon size={17} />
              {label}
              {label === "SCOUT Briefing" && (
                <span className="public-demo-new">Sample</span>
              )}
            </Link>
          ))}
          <Link
            href="/demo/saved"
            className={pathname === "/demo/saved" ? "active" : ""}
          >
            <Bookmark size={17} />
            Saved
            {prefs.saved.length > 0 && (
              <span className="public-demo-count">{prefs.saved.length}</span>
            )}
          </Link>
        </nav>
        <div className="public-demo-side-foot">
          <span>Hotel market intelligence</span>
          <Link href="/">
            About SCOUT <ArrowRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="public-demo-main">
        <header className="public-demo-topbar">
          <button
            className="public-demo-menu"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            href="/demo"
            className="public-demo-mobile-brand"
            aria-label="SCOUT demo home"
          >
            <img src="/brand/scout-icon.webp" width={48} height={48} alt="" />
          </Link>
          <div className="public-demo-breadcrumb">
            Willow House Hotel <span>/</span>{" "}
            {current?.label ??
              (detail ? "Finding details" : "Market Blueprint")}
          </div>
          <span className="public-demo-fiction-tag">Fictional sample</span>
        </header>
        <main className="public-demo-content">
          <div className="public-demo-demo-banner">
            <span>
              <strong>Fictional demo</strong> · Every hotel, organization,
              event, mention and source is invented. Sample dates are
              illustrative.
            </span>
            <span>
              Research, schedules, paid calls and notifications are off.
            </span>
          </div>
          {status && (
            <div className="public-demo-status" role="status">
              {status}
              <button
                aria-label="Dismiss message"
                onClick={() => setStatus("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="public-demo-heading">
            <div>
              <span className="public-demo-eyebrow">
                {current?.label ??
                  (detail
                    ? "FINDING DETAILS"
                    : "WILLOW HOUSE HOTEL · DEMO HARBOR")}
              </span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {page === "blueprint" && (
              <button
                className="public-demo-button secondary"
                onClick={() => exportFindings(queryFindings(activeFindings))}
              >
                <ArrowDownToLine size={16} /> Export CSV
              </button>
            )}
          </div>
          {!ready && (
            <p className="public-demo-storage-note" aria-live="polite">
              Loading this browser’s demo preferences…
            </p>
          )}
          {content}
          <footer className="public-demo-footer">
            <span>SCOUT by SalesHospitality</span>
            <span>Fictional examples · no live research</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Overview({
  findings,
  savedCount,
}: {
  findings: PublicDemoFinding[];
  savedCount: number;
}) {
  return (
    <>
      <section className="public-demo-welcome">
        <div>
          <span className="public-demo-eyebrow">
            YOUR HOTEL’S MARKET, AT A GLANCE
          </span>
          <h2>Useful signals, with the context to judge them.</h2>
          <p>
            SCOUT brings local demand signals, competitor changes and public
            mentions together—then connects the evidence to practical hotel
            questions.
          </p>
          <Link className="public-demo-button light" href="/demo/blueprint">
            Explore the Market Blueprint <ArrowRight size={16} />
          </Link>
        </div>
        <div className="public-demo-welcome-card">
          <div className="public-demo-avatar">
            <Hotel size={19} />
          </div>
          <div>
            <strong>Willow House Hotel</strong>
            <span>Independent hotel · Demo Harbor</span>
          </div>
          <span className="public-demo-ready-dot">Fictional</span>
          <div className="public-demo-welcome-metric">
            <span>{findings.length}</span>
            <small>sample findings</small>
          </div>
          <div className="public-demo-welcome-metric">
            <span>5</span>
            <small>research categories</small>
          </div>
          <div className="public-demo-welcome-metric">
            <span>{savedCount}</span>
            <small>saved by you</small>
          </div>
        </div>
      </section>
      <section className="public-demo-category-section">
        <div className="public-demo-section-title">
          <div>
            <span className="public-demo-eyebrow">FIVE WAYS SCOUT HELPS</span>
            <h2>One hotel market. A connected view.</h2>
          </div>
          <Link href="/demo/blueprint">
            All findings <ArrowRight size={15} />
          </Link>
        </div>
        <div className="public-demo-category-grid">
          {[
            [
              "Corporate",
              "Companies, expansions and training that may bring visitors.",
              "/demo/blueprint",
              "01",
            ],
            [
              "Project",
              "Construction and installations that can create extended stays.",
              "/demo/blueprint",
              "02",
            ],
            [
              "Event",
              "Multi-day gatherings with potential overnight participation.",
              "/demo/blueprint",
              "03",
            ],
            [
              "Competitor",
              "Noteworthy public changes at hotels you select.",
              "/demo/competitors",
              "04",
            ],
            [
              "Property",
              "Public mentions of your hotel, with dates and match context.",
              "/demo/property",
              "05",
            ],
          ].map(([name, text, href, number]) => (
            <Link href={href} className="public-demo-category-card" key={name}>
              <span>{number}</span>
              <h3>{name} SCOUT</h3>
              <p>{text}</p>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="public-demo-brief-promo">
        <div>
          <span className="public-demo-eyebrow">
            BRING THE SIGNALS TOGETHER
          </span>
          <h2>A briefing built around what may matter to your hotel.</h2>
          <p>
            See practical implications, linked evidence and the important
            unknowns in one reviewable summary.
          </p>
        </div>
        <Link href="/demo/briefing" className="public-demo-button">
          View sample briefing <ArrowRight size={16} />
        </Link>
      </section>
      <section className="public-demo-recent">
        <div className="public-demo-section-title">
          <div>
            <span className="public-demo-eyebrow">A FEW RECENT EXAMPLES</span>
            <h2>Findings with useful context.</h2>
          </div>
          <Link href="/demo/blueprint">
            View all {findings.length} <ArrowRight size={15} />
          </Link>
        </div>
        <FindingList
          findings={findings.slice(0, 3)}
          saved={[]}
          dismissed={[]}
          onSave={() => {}}
          onDismiss={() => {}}
          onCopy={() => {}}
          onExport={() => {}}
          actionsEnabled={false}
        />
      </section>
    </>
  );
}

function FilterBar({
  query,
  category,
  setQuery,
  setCategory,
}: {
  query: string;
  category: "All" | PublicDemoCategory;
  setQuery: (value: string) => void;
  setCategory: (value: "All" | PublicDemoCategory) => void;
}) {
  return (
    <div className="public-demo-filterbar">
      <label>
        <Search size={17} />
        <span className="sr-only">Search findings</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search findings, places or organizations"
        />
      </label>
      <div className="public-demo-filter-pills">
        {(["All", ...publicDemoCategories] as const).map((item) => (
          <button
            key={item}
            className={category === item ? "selected" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function FindingList({
  findings,
  saved,
  dismissed,
  onSave,
  onDismiss,
  onCopy,
  onExport,
  actionsEnabled = true,
}: {
  findings: PublicDemoFinding[];
  saved: string[];
  dismissed: string[];
  onSave: (finding: PublicDemoFinding) => void;
  onDismiss: (finding: PublicDemoFinding) => void;
  onCopy: (finding: PublicDemoFinding) => void;
  onExport: () => void;
  actionsEnabled?: boolean;
}) {
  if (!findings.length)
    return (
      <div className="public-demo-empty">
        <FileSearch size={23} />
        <h2>No findings here yet</h2>
        <p>
          Try another filter, save a finding from the Blueprint or restore one
          you dismissed.
        </p>
      </div>
    );
  return (
    <div className="public-demo-results">
      <div className="public-demo-results-meta">
        <span>
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
        <span>Fictional source examples · no current research</span>
        {actionsEnabled && (
          <button onClick={onExport}>
            <ArrowDownToLine size={15} /> CSV
          </button>
        )}
      </div>
      <div className="public-demo-finding-list">
        {findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            saved={saved.includes(finding.id)}
            dismissed={dismissed.includes(finding.id)}
            onSave={() => onSave(finding)}
            onDismiss={() => onDismiss(finding)}
            onCopy={() => onCopy(finding)}
            actionsEnabled={actionsEnabled}
          />
        ))}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  saved,
  dismissed,
  onSave,
  onDismiss,
  onCopy,
  actionsEnabled = true,
}: {
  finding: PublicDemoFinding;
  saved: boolean;
  dismissed: boolean;
  onSave: () => void;
  onDismiss: () => void;
  onCopy: () => void;
  actionsEnabled?: boolean;
}) {
  return (
    <article
      className={`public-demo-finding-card category-${finding.category.toLowerCase()} ${dismissed ? "is-dismissed" : ""}`}
    >
      <div className="public-demo-card-top">
        <span
          className={`public-demo-category-chip category-${finding.category.toLowerCase()}`}
        >
          {finding.category}
        </span>
        <span>{finding.status}</span>
        {finding.sentiment && (
          <span className="public-demo-sentiment">
            {finding.sentiment} tone
          </span>
        )}
      </div>
      <h2>
        <Link href={`/demo/findings/${finding.id}`}>{finding.title}</Link>
      </h2>
      <p className="public-demo-finding-location">
        <MapPin size={14} />
        {finding.location}
        <span>·</span>
        {finding.dateLabel}
      </p>
      <p>{finding.summary}</p>
      <div className="public-demo-relevance">
        <strong>Why it may matter</strong>
        <p>{finding.relevance}</p>
      </div>
      <div className="public-demo-source">
        <span className="public-demo-source-icon">↗</span>
        <div>
          <strong>{finding.source.label}</strong>
          <span>{finding.source.published} · fictional example</span>
        </div>
      </div>
      {actionsEnabled && (
        <div className="public-demo-card-actions">
          <button className={saved ? "active" : ""} onClick={onSave}>
            {saved ? <Check size={15} /> : <Bookmark size={15} />}
            {saved ? "Saved" : "Save"}
          </button>
          <button onClick={onDismiss}>
            {dismissed ? <Check size={15} /> : <X size={15} />}
            {dismissed ? "Restore" : "Dismiss"}
          </button>
          <button onClick={onCopy}>
            <Copy size={15} />
            Copy
          </button>
        </div>
      )}
    </article>
  );
}

function FindingDetail({
  finding,
  saved,
  dismissed,
  onSave,
  onDismiss,
  onCopy,
}: {
  finding: PublicDemoFinding;
  saved: boolean;
  dismissed: boolean;
  onSave: () => void;
  onDismiss: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="public-demo-detail-layout">
      <div className="public-demo-detail-main">
        <div
          className={`public-demo-detail-hero category-${finding.category.toLowerCase()}`}
        >
          <span
            className={`public-demo-category-chip category-${finding.category.toLowerCase()}`}
          >
            {finding.category}
          </span>
          <span>{finding.status}</span>
          {finding.sentiment && (
            <span className="public-demo-sentiment">
              {finding.sentiment} tone
            </span>
          )}
          <p>{finding.summary}</p>
        </div>
        <section className="public-demo-detail-section">
          <h2>Why it may matter to the hotel</h2>
          <p>{finding.relevance}</p>
        </section>
        <section className="public-demo-detail-section">
          <h2>What is still unknown</h2>
          <ul>
            {finding.unknowns.map((unknown) => (
              <li key={unknown}>{unknown}</li>
            ))}
          </ul>
        </section>
        <section className="public-demo-detail-section">
          <h2>Evidence</h2>
          <div className="public-demo-evidence">
            <strong>{finding.source.label}</strong>
            <span>Published {finding.source.published}</span>
            <a href={finding.source.url} target="_blank" rel="noreferrer">
              {finding.source.url}
            </a>
            <small>
              Reserved .example URL · fictional source, not a live publisher.
            </small>
          </div>
        </section>
      </div>
      <aside className="public-demo-detail-aside">
        <span className="public-demo-eyebrow">AT A GLANCE</span>
        <p>
          <strong>Place</strong>
          {finding.location}
        </p>
        <p>
          <strong>When</strong>
          {finding.dateLabel}
        </p>
        <p>
          <strong>Hotel connection</strong>
          {finding.category === "Property"
            ? "Matched to fictional Willow House Hotel for this sample."
            : "Possible lodging relevance is an inference and needs confirmation."}
        </p>
        <div className="public-demo-detail-actions">
          <button className="public-demo-button" onClick={onSave}>
            {saved ? <Check size={16} /> : <Bookmark size={16} />}
            {saved ? "Saved" : "Save finding"}
          </button>
          <button className="public-demo-button secondary" onClick={onDismiss}>
            {dismissed ? "Restore finding" : "Dismiss"}
          </button>
          <button className="public-demo-button secondary" onClick={onCopy}>
            <Copy size={16} />
            Copy brief
          </button>
        </div>
      </aside>
    </div>
  );
}

function Briefing({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="public-demo-briefing">
      <div className="public-demo-briefing-label">
        <ClipboardList size={18} /> FICTIONAL EXAMPLE BRIEFING{" "}
        <span>Not live research</span>
      </div>
      <h2>{publicDemoBriefing.title}</h2>
      <p className="public-demo-briefing-intro">
        {publicDemoBriefing.introduction}
      </p>
      <div className="public-demo-briefing-meta">
        <span>
          <Hotel size={15} /> Willow House Hotel
        </span>
        <span>
          <MapPin size={15} /> Demo Harbor, Washington
        </span>
        <span>{publicDemoBriefing.asOf}</span>
      </div>
      {publicDemoBriefing.sections.map((section, index) => (
        <section className="public-demo-brief-section" key={section.heading}>
          <div className="public-demo-brief-number">0{index + 1}</div>
          <div>
            <h3>{section.heading}</h3>
            <p>{section.implication}</p>
            <div className="public-demo-cited-findings">
              <strong>Evidence in this sample</strong>
              {section.findingIds.map((id) => {
                const finding = publicDemoFindings.find(
                  (item) => item.id === id,
                )!;
                return (
                  <button key={id} onClick={() => onOpen(id)}>
                    <span>{finding.category}</span>
                    {finding.title}
                    <ArrowRight size={14} />
                  </button>
                );
              })}
            </div>
            <p className="public-demo-brief-unknown">
              <strong>Still unknown:</strong> {section.unknowns}
            </p>
          </div>
        </section>
      ))}
      <div className="public-demo-brief-foot">
        <strong>How to use this:</strong> Treat this as an example of the
        format. Confirm the source, opportunity, timing and decision-maker
        before acting. All data and citations are fictional.
      </div>
    </div>
  );
}
