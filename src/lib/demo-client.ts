"use client";
import { filterFindings, filtersSchema } from "./contracts";
import { toCsv } from "./export";
import {
  sandboxStorageKey,
  type SandboxState,
  type SandboxCommand,
} from "./sandbox-contracts";

const json = (value: unknown, status = 200) => Response.json(value, { status });
function load(): SandboxState | null {
  const raw = localStorage.getItem(sandboxStorageKey);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as SandboxState;
    if (
      state.journal?.version !== 1 ||
      !Array.isArray(state.workspace?.findings) ||
      !state.subscription ||
      !Number.isFinite(Date.parse(state.journal.createdAt)) ||
      Date.now() - Date.parse(state.journal.createdAt) >= 7 * 86400000
    ) {
      localStorage.removeItem(sandboxStorageKey);
      return null;
    }
    return state;
  } catch {
    localStorage.removeItem(sandboxStorageKey);
    return null;
  }
}
// Browser-local persistence, shared within this browser profile only. Web Locks
// serialize updates from different tabs so a slow response cannot overwrite a save.
export async function demoFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    if (!navigator.locks)
      throw Error(
        "This browser cannot safely save the demo. Use a current browser with storage enabled.",
      );
    return await navigator.locks.request("scout-synthetic-state", async () => {
      const target = new URL(url, location.origin),
        method = init.method ?? "GET";
      let state = load();
      if (target.pathname === "/api/demo/session" && method === "DELETE") {
        localStorage.removeItem(sandboxStorageKey);
        window.dispatchEvent(new Event("scout-demo-change"));
        return json({ ok: true });
      }
      const start =
        target.pathname === "/api/demo/session" && method === "POST";
      if (!state && !start)
        return json(
          { error: "Start your isolated fictional demo to continue." },
          401,
        );
      let command: SandboxCommand | undefined;
      const input = init.body ? JSON.parse(String(init.body)) : undefined;
      if (target.pathname === "/api/demo/workspace" && method === "PATCH")
        command = { kind: "mutation", input };
      else if (target.pathname === "/api/demo/research" && method === "POST")
        command = { kind: "research", input };
      else if (
        target.pathname === "/api/demo/subscription" &&
        method === "POST"
      )
        command = { kind: "subscription", input };
      else if (target.pathname === "/api/demo/worker" && method === "POST")
        command = { kind: "worker" };
      if (command || (!state && start)) {
        const response = await fetch("/api/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            journal: state?.journal ?? null,
            ...(command ? { command } : {}),
          }),
        });
        if (!response.ok) return response;
        state = (await response.json()) as SandboxState;
        // Commit only after server validation and only while holding the browser lock.
        localStorage.setItem(sandboxStorageKey, JSON.stringify(state));
        window.dispatchEvent(new Event("scout-demo-change"));
      }
      if (start) return json({ ok: true });
      if (!state) return json({ error: "Demo unavailable." }, 401);
      if (
        target.pathname === "/api/demo/subscription" ||
        target.pathname === "/api/demo/worker"
      )
        return json(state.subscription);
      if (target.pathname === "/api/demo/export") {
        const params = target.searchParams;
        const filters = filtersSchema.parse(
          Object.fromEntries(
            [...params.entries()].filter(([k]) => k !== "ids"),
          ),
        );
        let findings = filterFindings(state.workspace.findings, filters);
        if (params.has("ids")) {
          const ids = params.get("ids")!.split(",");
          if (
            ids.some(
              (id) => !state!.workspace.findings.some((f) => f.id === id),
            )
          )
            return json({ error: "Finding unavailable in this demo." }, 404);
          findings = findings.filter((f) => ids.includes(f.id));
        }
        return new Response(toCsv(findings), {
          headers: { "Content-Type": "text/csv; charset=utf-8" },
        });
      }
      return json(state.workspace);
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Browser storage unavailable. Enable storage and retry.",
      },
      400,
    );
  }
}
