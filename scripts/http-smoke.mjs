// Non-browser acceptance of compiled routes. Requires npm run build.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

async function freePort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
async function withServer(demo, verify) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    SCOUT_DEMO_ENABLED: demo ? "true" : "false",
  };
  delete env.VERCEL;
  delete env.VERCEL_ENV;
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  let logs = "";
  child.stdout.on("data", (b) => (logs += b));
  child.stderr.on("data", (b) => (logs += b));
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw Error(logs);
      try {
        const r = await fetch(base);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, "Server must start");
    await verify(base);
  } catch (e) {
    console.error(logs);
    throw e;
  } finally {
    const stopped = once(child, "exit");
    child.kill();
    await stopped;
  }
}
let checks = 0;
function status(response, expected) {
  assert.equal(response.status, expected);
  checks++;
}
await withServer(false, async (base) => {
  status(await fetch(`${base}/`), 200);
  const gate = await (await fetch(`${base}/demo/blueprint`)).text();
  assert.match(gate, /interactive workspace is not available yet/);
  assert.ok(
    !gate.includes("npm run dev:demo") &&
      !gate.includes("Start my fictional demo"),
  );
  checks++;
  const home = await (await fetch(base)).text();
  assert.ok(
    home.includes('href="/sample#corporate"') && !home.includes('href="/demo"'),
  );
  checks++;
  const sample = await fetch(`${base}/sample`);
  status(sample, 200);
  const sampleHtml = await sample.text();
  assert.match(sampleHtml, /FICTIONAL SAMPLE/);
  assert.match(
    sampleHtml,
    /<title>Fictional market blueprint sample · SCOUT<\/title>/,
  );
  assert.ok(sampleHtml.includes('id="corporate"'));
  checks++;
  const download = await fetch(`${base}/sample/export`);
  status(download, 200);
  assert.match(
    download.headers.get("content-disposition"),
    /scout-fictional-sample/,
  );
  assert.match(await download.text(), /FICTIONAL DEMO/);
  checks++;
  status(await fetch(`${base}/api/workspace`), 503);
  status(await fetch(`${base}/api/demo/workspace`), 503);
  status(await fetch(`${base}/api/demo/export`), 503);
  status(await fetch(`${base}/api/demo/subscription`), 503);
  status(
    await fetch(`${base}/api/demo/research`, {
      method: "POST",
      headers: { origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: "baseline",
        cycleKey: "disabled-replay",
      }),
    }),
    503,
  );
  status(
    await fetch(`${base}/api/demo/session`, {
      method: "POST",
      headers: { origin: base },
    }),
    503,
  );
});
await withServer(true, async (base) => {
  for (const route of [
    "/",
    "/demo",
    "/demo/blueprint",
    "/demo/agents",
    "/demo/agents/corporate",
    "/demo/agents/project",
    "/demo/agents/event",
    "/demo/updates",
    "/demo/exports",
    "/demo/profile",
    "/demo/admin",
    "/demo/findings/corporate-alder",
    "/app",
  ])
    status(await fetch(`${base}${route}`), 200);
  status(await fetch(`${base}/api/demo/workspace`), 401);
  status(await fetch(`${base}/api/demo/export`), 401);
  status(await fetch(`${base}/api/workspace`), 503);
  status(
    await fetch(`${base}/api/demo/session`, {
      method: "POST",
      headers: { origin: "https://outside.example" },
    }),
    403,
  );
  const start = async () => {
    const r = await fetch(`${base}/api/demo/session`, {
      method: "POST",
      headers: { origin: base },
    });
    status(r, 200);
    const cookie = r.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=strict/i);
    return cookie.split(";")[0];
  };
  const a = await start(),
    b = await start();
  const get = (cookie, suffix = "/api/demo/workspace") =>
    fetch(base + suffix, { headers: { cookie } });
  const patch = (body, cookie = a, origin = base) =>
    fetch(`${base}/api/demo/workspace`, {
      method: "PATCH",
      headers: { cookie, origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    let r = await get(a);
    status(r, 200);
    assert.match(r.headers.get("cache-control"), /no-store/);
    let wa = await r.json();
    assert.equal(wa.findings.length, 9);
    checks++;
    const profile = wa.profile;
    status(
      await patch({
        action: "state",
        findingId: "corporate-alder",
        saved: true,
        dismissed: true,
      }),
      200,
    );
    wa = await (await get(a)).json();
    const wb = await (await get(b)).json();
    assert.equal(wa.findings[0].saved, true);
    assert.equal(wb.findings[0].saved, false);
    checks++;
    status(
      await patch({
        action: "state",
        findingId: "corporate-alder",
        saved: false,
        dismissed: false,
        tenant_id: "forged",
      }),
      400,
    );
    status(await get(a, "/api/demo/workspace?property_id=forged"), 400);
    status(await get(a, "/api/demo/export?tenant_id=forged"), 400);
    status(
      await patch({
        action: "state",
        findingId: "unknown",
        saved: true,
        dismissed: false,
      }),
      404,
    );
    status(
      await patch({
        action: "profile",
        profile: { ...profile, radiusMiles: -2 },
      }),
      400,
    );
    status(
      await patch({
        action: "profile",
        profile: { ...profile, name: "Private HTTP sample hotel" },
      }),
      200,
    );
    assert.equal((await (await get(b)).json()).profile.name, profile.name);
    checks++;
    status(
      await patch({
        action: "coverage",
        category: "project",
        notes: "Scoped fixture coverage",
        paused: false,
      }),
      200,
    );
    status(await patch({ action: "setup", step: 5 }), 400);
    status(await patch({ action: "setup", step: 1 }), 200);
    status(
      await patch({ action: "setup", step: 1 }, a, "https://outside.example"),
      403,
    );
    r = await get(
      a,
      "/api/demo/export?category=event&state=all&ids=event-harbor",
    );
    status(r, 200);
    assert.match(r.headers.get("content-type"), /text\/csv/);
    const csv = await r.text();
    assert.equal((csv.match(/FICTIONAL DEMO/g) || []).length, 1);
    assert.ok(csv.includes("2027-02-12"));
    assert.ok(!csv.includes("corporate-alder"));
    checks++;
    r = await get(a, "/api/demo/export?state=saved");
    status(r, 200);
    assert.ok((await r.text()).includes("corporate-alder"));
    checks++;
    status(await get(a, "/api/demo/export?ids=unknown"), 404);
    status(await get(a, "/api/demo/export?category=forged"), 400);
    const cookieFromA = a.split("=")[1];
    const html = await (await fetch(`${base}/demo`)).text();
    assert.ok(!html.includes(cookieFromA));
    checks++;
    const replay = (body, cookie = a, origin = base) =>
      fetch(`${base}/api/demo/research`, {
        method: "POST",
        headers: { cookie, origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    status(
      await replay({ scenario: "baseline", cycleKey: "anonymous-replay" }, ""),
      401,
    );
    status(
      await replay({ scenario: "live", cycleKey: "blocked-live-mode" }),
      400,
    );
    status(
      await replay({
        scenario: "baseline",
        cycleKey: "forged-scope",
        tenant_id: "forged",
      }),
      400,
    );
    status(
      await replay(
        { scenario: "baseline", cycleKey: "cross-origin" },
        a,
        "https://outside.example",
      ),
      403,
    );
    r = await replay({ scenario: "baseline", cycleKey: "http-baseline" });
    status(r, 200);
    const baseline = await r.json();
    assert.equal(baseline.runs[0].newIds.length, 3);
    assert.equal(baseline.findings.length, 12);
    checks++;
    const syntheticId = baseline.runs[0].newIds[0];
    status(
      await replay({ scenario: "baseline", cycleKey: "http-baseline" }),
      200,
    );
    status(
      await replay({ scenario: "update", cycleKey: "http-baseline" }),
      409,
    );
    r = await replay({ scenario: "update", cycleKey: "http-material-update" });
    status(r, 200);
    assert.equal((await r.json()).runs[0].changedIds.length, 3);
    checks++;
    r = await replay({ scenario: "quiet", cycleKey: "http-quiet-cycle" });
    status(r, 200);
    const quiet = await r.json();
    assert.equal(quiet.runs[0].summary, "No meaningful changes found.");
    assert.equal(quiet.runs[0].usage.actualChargedUsd, 0);
    checks++;
    assert.equal((await (await get(b)).json()).findings.length, 9);
    checks++;
    status(await get(b, `/api/demo/export?state=all&ids=${syntheticId}`), 404);
    status(
      await patch({
        action: "state",
        findingId: syntheticId,
        saved: true,
        dismissed: true,
      }),
      200,
    );
    r = await get(a, `/api/demo/export?state=all&ids=${syntheticId}`);
    status(r, 200);
    const syntheticCsv = await r.text();
    assert.ok(syntheticCsv.includes("sources.example/replay/"));
    assert.ok(syntheticCsv.includes("FICTIONAL DEMO"));
    checks++;
    const afterRead = await (await get(a)).json();
    assert.equal(afterRead.runs.length, quiet.runs.length);
    assert.deepEqual(afterRead.runs[0].usage, quiet.runs[0].usage);
    assert.equal(
      afterRead.findings.find((f) => f.id === syntheticId).saved,
      true,
    );
    checks++;
    const subscription = (body, cookie = a, origin = base) =>
      fetch(`${base}/api/demo/subscription`, {
        method: "POST",
        headers: { cookie, origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    status(await fetch(`${base}/api/demo/subscription`), 401);
    status(await get(a, "/api/demo/subscription?property_id=forged"), 400);
    status(
      await subscription({ action: "baseline" }, a, "https://outside.example"),
      403,
    );
    status(
      await subscription({
        action: "configure",
        active: true,
        entitled: true,
        runCredits: 1500,
        monthCredits: 10000,
        tenant_id: "forged",
      }),
      400,
    );
    status(await subscription({ action: "baseline" }), 400);
    for (const category of ["corporate", "project", "event"])
      status(
        await patch({
          action: "coverage",
          category,
          notes: "HTTP fixture coverage",
          paused: false,
        }),
        200,
      );
    status(
      await subscription({
        action: "configure",
        active: true,
        entitled: true,
        runCredits: 1500,
        monthCredits: 10000,
      }),
      200,
    );
    status(await subscription({ action: "baseline" }), 200);
    status(await subscription({ action: "baseline" }), 200);
    const queued = await (await get(a, "/api/demo/subscription")).json();
    assert.equal(queued.jobs.length, 1);
    assert.equal(queued.jobs[0].state, "queued");
    assert.equal(queued.jobs[0].attempts, 0);
    checks++;
    assert.equal((await (await get(a)).json()).runs.length, quiet.runs.length);
    checks++;
    assert.equal(
      (await (await get(b, "/api/demo/subscription")).json()).jobs.length,
      0,
    );
    checks++;
    status(
      await subscription({
        action: "configure",
        active: false,
        entitled: false,
        runCredits: 1500,
        monthCredits: 10000,
      }),
      200,
    );
    status(
      await subscription({
        action: "enqueue",
        scenario: "update",
        key: "paused-update",
      }),
      400,
    );
  } finally {
    for (const cookie of [a, b])
      status(
        await fetch(`${base}/api/demo/session`, {
          method: "DELETE",
          headers: { cookie, origin: base },
        }),
        200,
      );
  }
  status(await get(a), 401);
});
console.log(
  `HTTP smoke passed: ${checks} assertions; compiled pages, access gates, session isolation, mutations and exports. No browser used.`,
);
