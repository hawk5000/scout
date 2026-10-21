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
  { href: "/demo", label: "Overview", icon: LayoutDashboard },
  { href: "/demo/blueprint", label: "Market Blueprint", icon: FileSearch },
  { href: "/demo/agents", label: "Research Agents", icon: Compass },
  { href: "/demo/updates", label: "Updates", icon: Bell },
  { href: "/demo/exports", label: "Exports", icon: Download },
  { href: "/demo/profile", label: "Hotel Profile", icon: Hotel },
  { href: "/demo/admin", label: "Administrator setup", icon: Settings2 },
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
          Explore a fictional hotel market with nine sample findings and all
          three SCOUT perspectives. Save, filter and export in your own isolated
          demo workspace. Changes stay in this browser for seven days. Use
          fictional information only.
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
  if (!segment) content = <Overview data={data} />;
  else if (segment === "blueprint")
    content = (
      <>
        <PageHeading
          title="Your market blueprint."
          description="The accumulated picture of your market. Search, review and take useful intelligence into your own workflow."
        />
        <Blueprint runs={data.runs} findings={data.findings} notify={notify} />
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
          title="A market that keeps its history."
          description="Sample cycles show new findings, meaningful changes, quiet results and coverage limitations."
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
                (href === "/demo/blueprint" && path.includes("/findings/"))
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
                requested in administrator setup.
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
function Overview({ data }: { data: Workspace }) {
  const changed = latestMaterialUpdate(data.runs, data.findings);
  const latest = [...data.runs].sort((a, b) => b.at.localeCompare(a.at))[0];
  const verification = data.findings.filter(
    (f) => f.quality === "Needs verification",
  ).length;
  return (
    <>
      <PageHeading
        title="Your market, in focus."
        description="One blueprint. Three perspectives on your fictional market."
        action={
          <Link href="/demo/blueprint" className="button gold">
            View blueprint <ArrowRight size={17} />
          </Link>
        }
      />
      <div className="coverage-strip" aria-label="Research coverage">
        {categories.map((c) => (
          <Link key={c} href={`/demo/agents/${c}`}>
            <strong>{categoryNames[c]}</strong>
            <span>{data.coverage[c].paused ? "Paused" : "Demo only"}</span>
          </Link>
        ))}
        <span>No research scheduled</span>
      </div>
      <div className="stat-row overview-stats">
        <Link className="stat" href="/demo/blueprint?state=all">
          <strong>{data.findings.length}</strong>
          <span>
            Market findings
            <small>All recorded findings, including dismissed</small>
          </span>
        </Link>
        <Link className="stat" href="/demo/blueprint?view=updated&state=all">
          <strong>{changed.ids.size}</strong>
          <span>
            Materially changed
            <small>
              {changed.run ? (
                <>
                  In the <DateText value={changed.run.at} /> update
                </>
              ) : (
                "No recorded material updates"
              )}
            </small>
          </span>
        </Link>
        <Link
          className="stat"
          href="/demo/blueprint?state=all&quality=Needs%20verification"
        >
          <strong>{verification}</strong>
          <span>
            Need verification
            <small>Current evidence status · all records</small>
          </span>
        </Link>
      </div>
      {latest && (
        <div className="latest-cycle">
          <span>
            <strong>
              Latest sample cycle · <DateText value={latest.at} />
            </strong>
            <br />
            {latest.status !== "Completed"
              ? "Incomplete coverage — this is not a successful quiet check."
              : latest.newIds.length || latest.changedIds.length
                ? "Completed sample check."
                : "Completed quiet check — no new findings or material changes."}{" "}
            <Link href={`/demo/updates#${latest.id}`}>
              {latest.newIds.length} new · {latest.changedIds.length} materially
              changed in this cycle
            </Link>
          </span>
          <ArrowLink href={`/demo/updates#${latest.id}`}>
            Review cycle
          </ArrowLink>
        </div>
      )}
      <section className="panel recent-panel">
        <div className="section-heading">
          <div>
            <h2>Recent intelligence</h2>
            <p>Most recent material changes first. Not dismissed.</p>
          </div>
          <ArrowLink href="/demo/blueprint">View all</ArrowLink>
        </div>
        <FindingTable
          findings={sortFindings(
            data.findings.filter((f) => !f.dismissed),
            "changed",
          ).slice(0, 4)}
        />
      </section>
      <div className="overview-bottom">
        <section>
          <h3>Keep useful context close.</h3>
          <p>
            Save findings for your next review, then export to the sales tools
            you already use.
          </p>
          <ArrowLink href="/demo/blueprint?view=saved">
            Review saved findings
          </ArrowLink>
        </section>
        <section>
          <h3>Your research area</h3>
          <p>
            {data.profile.marketCenter} · {data.profile.radiusMiles}-mile radius
            <br />
            {data.profile.includedPlaces.join(", ")}
          </p>
          <ArrowLink href="/demo/profile">Review hotel profile</ArrowLink>
        </section>
      </div>
    </>
  );
}
