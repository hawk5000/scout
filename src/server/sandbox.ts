import { DemoRepository, AccessError, tokenHash } from "./repository";
import { sandboxRequest, type SandboxState } from "../lib/sandbox-contracts";
import {
  SubscriptionStore,
  claimJob,
  processJob,
} from "../research/subscription";
import type { Scope } from "../research/contracts";

// Public synthetic calculator, NOT authentication or a customer repository.
// Each call owns one fresh memory database. Never accepts identity, database paths,
// URLs, provider credentials or a production adapter from a caller.
export function evaluateSandbox(
  input: unknown,
  now = Date.now(),
): SandboxState {
  const request = sandboxRequest.parse(input);
  const journal = request.journal ?? {
    version: 1 as const,
    createdAt: new Date(now).toISOString(),
    events: [],
  };
  const created = Date.parse(journal.createdAt);
  if (created > now + 60000 || now - created >= 7 * 86400000)
    throw new AccessError(
      "This fictional demo has expired. Clear it and start a new demo.",
      410,
    );
  if (request.command)
    journal.events.push({
      at: new Date(now).toISOString(),
      command: request.command,
    });
  if (
    journal.events.length > 128 ||
    journal.events.filter(
      (e) => e.command.kind === "research" || e.command.kind === "worker",
    ).length > 12
  )
    throw new AccessError(
      "Demo limit reached (128 changes / 12 fixture runs). Export your findings, then clear the demo to start again.",
      400,
    );
  let previous = created;
  for (const event of journal.events) {
    const at = Date.parse(event.at);
    if (at < previous || at > now + 60000)
      throw new AccessError("Invalid demo history.", 400);
    previous = at;
  }
  const repo = new DemoRepository(":memory:");
  const started = performance.now();
  try {
    const token = repo.createSession(now);
    const initial = repo.read(token);
    for (const category of initial.profile.categories)
      repo.mutate(token, {
        action: "coverage",
        category,
        notes: initial.coverage[category].notes,
        paused: false,
      });
    const scope = repo.db
      .prepare("SELECT tenant_id,property_id FROM sessions WHERE token_hash=?")
      .get(tokenHash(token)) as Scope;
    const subscription = new SubscriptionStore(repo.db, scope);
    for (const { at, command } of journal.events) {
      if (performance.now() - started > 6000)
        throw new AccessError(
          "Fixture history exceeded its time limit. Clear the demo and retry.",
          400,
        );
      if (command.kind === "mutation") repo.mutate(token, command.input);
      else if (command.kind === "research")
        repo.replay(token, command.input, new Date(at));
      else if (command.kind === "subscription")
        subscription.command(command.input, repo.read(token), new Date(at));
      else {
        const job = claimJob(repo.db, Date.parse(at));
        if (job && !processJob(repo.db, job, { now: () => Date.parse(at) }))
          throw new AccessError(
            "Fixture job could not complete. Review activation and category pauses.",
            409,
          );
      }
    }
    return {
      journal,
      workspace: repo.read(token),
      subscription: subscription.view(repo.read(token).profile, new Date(now)),
    };
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(
      error instanceof Error ? error.message : "Invalid synthetic action.",
      400,
    );
  } finally {
    repo.close();
  }
}
