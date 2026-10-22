"use client";
import { demoFetch } from "@/lib/demo-client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileSearch,
  Compass,
  Bell,
  Download,
  Hotel,
  Settings2,
  Menu,
  X,
  ArrowUpRight,
  ArrowRight,
  LogOut,
} from "lucide-react";
import {
  categories,
  categoryNames,
  type Category,
  type Mutation,
  type Workspace,
} from "@/lib/contracts";
import { Brand, ArrowLink, DateText, Empty, Notice, PageHeading } from "./ui";
import { latestMaterialUpdate, sortFindings } from "@/lib/finding-presentation";
import { DemoEntry } from "./demo-entry";
import { Blueprint, FindingDetail, FindingTable } from "./findings";
import { ProfileEditor, Setup } from "./profile";
import { AgentDetail, AgentList, RunHistory } from "./agents";
import { PilotReview } from "./pilot-review";
import { SubscriptionControls } from "./subscription";
import { ResearchReplay } from "./research-replay";
import type { Scenario } from "@/research/contracts";
const nav = [
  { href: "/demo", label: "Findings", icon: FileSearch },
  { href: "/demo/saved", label: "Saved", icon: Download },
  { href: "/demo/updates", label: "What’s changed", icon: Bell },
  { href: "/demo/profile", label: "Hotel Profile", icon: Hotel },
];
export function WorkspaceApp() {
  const path = usePathname();
  const [data, setData] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    );
  function notify(text: string, error = false) {
    setNotice({ text, error });
  }
  useEffect(() => {
    let active = true;
    demoFetch("/api/demo/workspace", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const refresh = () => {
      void demoFetch("/api/demo/workspace").then(async (r) => {
        if (active) {
          if (r.ok) setData(await r.json());
          else setData(null);
        }
      });
    };
    window.addEventListener("scout-demo-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      window.removeEventListener("scout-demo-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  useEffect(() => {
    setMenu(false);
    setNotice(null);
  }, [path]);
  async function mutate(input: Mutation) {
    setBusy(true);
    try {
      const r = await demoFetch("/api/demo/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      notify(
        input.action === "state"
          ? "Finding preference saved."
          : input.action === "setup"
            ? "Demo setup progress saved."
            : "Demo preferences saved. No research or delivery was started.",
      );
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed.", true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function exit() {
    setBusy(true);
    try {
      const r = await demoFetch("/api/demo/session", { method: "DELETE" });
      if (!r.ok) throw Error((await r.json()).error);
      window.location.assign("/");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not clear demo.", true);
      setBusy(false);
    }
  }
  async function replayScenario(scenario: Scenario, cycleKey: string) {
    setBusy(true);
    try {
      const response = await demoFetch("/api/demo/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, cycleKey }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setData(result);
      notify(
        "Synthetic scenario recorded. Review Updates and the Market Blueprint. No live activity occurred.",
      );
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Replay failed.", true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main id="main" className="access-page" aria-busy="true">
        <Brand />
        <h1>Opening your market…</h1>
        <p>Loading the fictional workspace.</p>
      </main>
    );
  if (!data)
    return (
      <main id="main" className="access-page">
        <Brand />
        <h1>Take a look around.</h1>
        <p>
          Explore the fictional prospecting sample: companies, projects and
          events. The expanded customer workspace also includes selected
          competitor changes, public mentions of your hotel and a source-linked
          SCOUT Briefing; those expanded findings are not part of this sample.
          Save, filter and export here. Changes stay in this browser for seven
          days. Use fictional information only.
        </p>
        <Notice>{loadError || "Start a demo session to continue."}</Notice>
        <DemoEntry label="Start my fictional demo" />
        <p className="fine-print">
          This workspace uses fictional data. Customer service is not yet
          activated.
        </p>
        <Link className="text-link" href="/">
          Back to the service
        </Link>
      </main>
    );
  const segment = path.replace(/^\/demo\/?/, "");
  let content: React.ReactNode;
  const shared = { data, mutate, notify, busy };
  if (!segment || segment === "blueprint" || segment === "saved")
    content = (
      <>
        <PageHeading
          title={
            segment === "saved"
              ? "Your saved findings."
              : "Your market findings."
          }
          description="What’s happening nearby, when it matters, and what is still unknown."
        />
        <Blueprint
          key={segment}
          initialView={segment === "saved" ? "saved" : "all"}
          runs={data.runs}
          findings={data.findings}
          notify={notify}
        />
        <details className="coverage-disclosure">
          <summary>Market coverage and last check</summary>
          <p>
            {data.profile.marketCenter} · {data.profile.radiusMiles}-mile
            radius. This sample covers companies, projects and events. The
            expanded customer workspace also includes selected competitors and
            public mentions of your hotel.
          </p>
          <p>
            Last recorded sample check:{" "}
            <DateText value={data.runs[0]?.at ?? null} />. No live research is
            scheduled.
          </p>
          <Link href="/demo/agents">Review coverage</Link>
        </details>
      </>
    );
  else if (segment === "exports")
    content = (
      <>
        <PageHeading
          title="Take the intelligence with you."
          description="Select findings or export your filtered blueprint to the sales tools you already use."
        />
        <Blueprint
          runs={data.runs}
          findings={data.findings}
          notify={notify}
          exportMode
        />
      </>
    );
  else if (segment === "agents") content = <AgentList data={data} />;
  else if (
    segment.startsWith("agents/") &&
    categories.includes(segment.split("/")[1] as Category)
  )
    content = (
      <AgentDetail
        key={segment}
        category={segment.split("/")[1] as Category}
        {...shared}
      />
    );
  else if (segment === "updates")
    content = (
      <>
        <PageHeading
          title="What’s changed."
          description="New findings and changes to dates, contractors and activity. All examples are fictional."
        />
        <Notice>
          Fictional run history. No live scheduled cycle or research call has
          taken place. Last successful sample:{" "}
          <DateText
            value={data.runs.find((r) => r.status === "Completed")?.at ?? null}
          />
          . Next cycle: not scheduled.
        </Notice>
        <RunHistory runs={data.runs} findings={data.findings} />
      </>
    );
  else if (segment === "profile")
    content = (
      <>
        <PageHeading
          title="Your hotel, in context."
          description="Confirmed details and clear boundaries help focus the right research."
        />
        <ProfileEditor profile={data.profile} mutate={mutate} busy={busy} />
      </>
    );
  else if (segment === "admin")
    content = (
      <>
        <PilotReview />
        <SubscriptionControls />
        <ResearchReplay busy={busy} onReplay={replayScenario} />
        <Setup {...shared} />
      </>
    );
  else if (segment.startsWith("findings/")) {
    const f = data.findings.find((f) => f.id === segment.split("/")[1]);
    content = f ? (
      <FindingDetail finding={f} mutate={mutate} notify={notify} busy={busy} />
    ) : (
      <Empty title="Finding unavailable">
        This record is not available in your property workspace.
      </Empty>
    );
  } else
    content = (
      <Empty title="This page is off the map">
        <Link href="/demo">Return to overview</Link>
      </Empty>
    );
  return (
    <div className="workspace">
      <header className="mobile-header">
        <Brand light />
        <button
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls="workspace-navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <aside
        className={`sidebar ${menu ? "open" : ""}`}
        id="workspace-navigation"
      >
        <Brand light />
        <div className="nav-label">YOUR MARKET WORKSPACE</div>
        <nav aria-label="Workspace">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className={
                path === href ||
                (href === "/demo/agents" && path.startsWith(href + "/")) ||
                (href === "/demo" &&
                  (path.includes("/findings/") || path === "/demo/blueprint"))
                  ? "active"
                  : ""
              }
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
        <details className="workspace-tools">
          <summary>Research &amp; setup</summary>
          <Link href="/demo/agents">Coverage</Link>
          <Link href="/demo/admin">Administrator setup</Link>
        </details>
        <div className="sidebar-bottom">
          <p>
            Your hotel’s market
            <br />
            research assistant.
          </p>
          <Link href="/">
            About SCOUT <ArrowUpRight size={15} />
          </Link>
          <button onClick={() => void exit()} disabled={busy}>
            <LogOut size={15} />
            Exit & clear demo
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="demo-banner">
          <div>
            <span>
              Demo workspace · All findings are fictional. Changes stay in this
              browser for seven days.
            </span>
            <details className="demo-disclosure">
              <summary>About this demo</summary>
              <p>
                Changes are stored only in this browser and expire seven days
                after the demo starts. Clearing browser data or exiting the demo
                also removes them. This is separate from customer accounts. Live
                research, paid API calls, scheduled research and sending are
                disabled. Sample updates are fictional and run only when
                requested in administrator setup. This sample covers companies,
                projects and events; the expanded customer workspace also has
                selected competitor tracking, hotel mentions and SCOUT Briefing.
              </p>
            </details>
          </div>
          <Link href="/demo/profile" className="property-context">
            <Hotel size={18} />
            <span>
              {data.profile.name}
              <small>Fictional demonstration market</small>
            </span>
          </Link>
        </div>
        <main id="main" className="workspace-content">
          {notice && (
            <div
              className={`toast ${notice.error ? "error" : ""}`}
              role={notice.error ? "alert" : "status"}
            >
              {notice.text}
              <button
                onClick={() => setNotice(null)}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {content}
        </main>
        <footer className="workspace-footer">
          <span>SCOUT by SalesHospitality</span>
          <span>Fictional market · no live research</span>
        </footer>
      </div>
    </div>
  );
}
