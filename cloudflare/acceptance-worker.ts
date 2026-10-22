import { handleCustomer, type Env } from "./customer/worker";
import {
  recordedAcceptanceProvider,
  recordedPilotConnector,
} from "./acceptance-provider";
import { CustomerStore, digest } from "../src/customer/store";
import { SilAuth } from "../src/customer/sil";
import { ReviewedImports } from "../src/customer/reviewed-imports";
import { PilotDispatcher } from "../src/research/pilot-dispatcher";
import { marketCategories } from "../src/customer/market-contracts";
// Dedicated acceptance entrypoint. Never imported by the production Worker.
const hostedAcceptancePilotId = "hosted_pass_c_acceptance_20261022_b";
export interface AcceptanceEnv extends Env {
  FIXTURE_PASSWORD?: string;
  ACCEPTANCE_EXPIRES_AT?: string;
}
const identities = [
  {
    email: "owner@fixture.example",
    tenantId: "fixture_tenant",
    propertyId: "fixture_hotel",
    userId: "fixture_user",
  },
  {
    email: "neighbor@fixture.example",
    tenantId: "fixture_tenant",
    propertyId: "fixture_neighbor",
    userId: "fixture_neighbor_user",
  },
  {
    email: "other@fixture.example",
    tenantId: "fixture_other_tenant",
    propertyId: "fixture_other_hotel",
    userId: "fixture_other_user",
  },
  {
    email: "viewer@fixture.example",
    tenantId: "fixture_tenant",
    propertyId: "fixture_hotel",
    userId: "fixture_viewer",
  },
];
export default {
  async fetch(request: Request, env: AcceptanceEnv): Promise<Response> {
    if (
      !env.FIXTURE_PASSWORD ||
      env.FIXTURE_PASSWORD.length < 32 ||
      !env.ACCEPTANCE_EXPIRES_AT ||
      Date.parse(env.ACCEPTANCE_EXPIRES_AT) <= Date.now() ||
      !Number.isFinite(Date.parse(env.ACCEPTANCE_EXPIRES_AT))
    )
      return new Response("Acceptance disabled", { status: 403 });
    try {
      const marker = await env.DB.prepare(
        "SELECT name FROM acceptance_marker WHERE name='synthetic-only'",
      ).first();
      const foreign = await env.DB.prepare(
        "SELECT tenant_id FROM customer_properties WHERE tenant_id NOT GLOB 'fixture_*' OR property_id NOT GLOB 'fixture_*' LIMIT 1",
      ).first();
      if (!marker || foreign)
        return new Response("Acceptance database required", { status: 403 });
    } catch {
      return new Response("Acceptance database required", { status: 403 });
    }
    if (new URL(request.url).pathname === "/pilot")
      return handlePilot(request, env);
    const transport: typeof fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      const input = JSON.parse(String(init?.body ?? "{}"));
      const match = path.endsWith("/login")
        ? identities.find((i) => i.email === input.email)
        : identities.find(
            (i) =>
              i.tenantId === input.tenantId &&
              i.propertyId === input.propertyId &&
              i.userId === input.userId,
          );
      const allowed =
        !!match &&
        input.appKey === "scout" &&
        (path.endsWith("/login")
          ? (await digest(input.password ?? "")) ===
            (await digest(env.FIXTURE_PASSWORD!))
          : path.endsWith("/session-status") && input.credentialVersion === 1);
      if (!allowed)
        return Response.json({ loginAllowed: false, sessionValid: false });
      return Response.json({
        ...match,
        appKey: "scout",
        credentialVersion: 1,
        loginAllowed: true,
        accessAllowed: true,
        sessionValid: true,
        mustChangePassword: false,
        propertyName: "Fictional hosted acceptance hotel",
      });
    };
    return handleCustomer(
      request,
      {
        ...env,
        CUSTOMER_ENABLED: "true",
        SIL_ORIGIN: "https://synthetic-auth.example",
        SIL_APP_KEY: "scout",
        SIL_SERVICE_TOKEN: "isolated-transport-no-network",
      },
      transport,
      (scope) => recordedAcceptanceProvider(env.DB, scope),
    );
  },
};

async function handlePilot(
  request: Request,
  env: AcceptanceEnv,
): Promise<Response> {
  if (request.method !== "POST" || new URL(request.url).search)
    return new Response("Not found", { status: 404 });
  if (
    (await digest(request.headers.get("authorization") ?? "")) !==
    (await digest(`Bearer ${env.SERVICE_TOKEN ?? ""}`))
  )
    return new Response("Access denied", { status: 403 });
  try {
    const body = (await request.json()) as {
      operation?: string;
      token?: string;
      requestKey?: string;
      jobId?: string;
      reviewId?: string;
      approvalHash?: string;
      decision?: "approved" | "rejected";
    };
    const fakeSil: typeof fetch = async (url, init) => {
      const path = new URL(String(url)).pathname,
        input = JSON.parse(String(init?.body ?? "{}"));
      const identity = identities.find(
        (i) =>
          i.tenantId === input.tenantId &&
          i.propertyId === input.propertyId &&
          i.userId === input.userId,
      );
      return Response.json(
        identity
          ? {
              ...identity,
              appKey: "scout",
              credentialVersion: 1,
              sessionValid: true,
              mustChangePassword: false,
            }
          : {},
      );
    };
    const store = new CustomerStore(
      env.DB,
      new SilAuth(
        {
          origin: "https://synthetic-auth.example",
          token: "fixture-only",
          appKey: "scout",
        },
        fakeSil,
      ),
    );
    if (!body.token)
      return Response.json(
        { error: "Fixture session required" },
        { status: 401 },
      );
    const scope = await store.expansionScope(body.token);
    if (
      scope.tenantId !== "fixture_tenant" ||
      scope.propertyId !== "fixture_hotel"
    )
      return Response.json(
        { error: "Synthetic fixture scope required" },
        { status: 403 },
      );
    const reviewer = new ReviewedImports(env.DB);
    if (body.operation === "run") {
      const expiry = Date.parse(env.ACCEPTANCE_EXPIRES_AT!);
      if (expiry - Date.now() > 7 * 86400000)
        return Response.json(
          { error: "Fixture expiry exceeds pilot limit" },
          { status: 403 },
        );
      const own = {
        name: "Fictional Hosted Acceptance Hotel",
        address: "1 Fictional Lane",
        locality: "Fictional Bay",
        domain: "hotel.example",
        aliases: [],
        formerNames: [],
        brand: "",
      };
      const config = {
        own,
        competitors: [
          {
            ...own,
            id: "fixture_competitor",
            name: "Fictional Ridge Hotel",
            address: "2 Fictional Lane",
            domain: "ridge.example",
            active: true,
          },
        ],
      };
      const plans = Object.fromEntries(
        marketCategories.map((c) => [
          c,
          { query: c, hosts: ["sources.example"], requiredUrls: [] },
        ]),
      );
      const policy = {
        config,
        plans,
        grants: [{ host: "sources.example", paths: ["/"] }],
      };
      const expiryMs = expiry;
      await env.DB.prepare(
        "INSERT INTO customer_pilot_policy(tenant_id,property_id,id,expires_at,max_jobs,total_micros,document_json) VALUES(?,?,?, ?,2,200000,?) ON CONFLICT(tenant_id,property_id,id) DO NOTHING",
      )
        .bind(
          scope.tenantId,
          scope.propertyId,
          hostedAcceptancePilotId,
          expiryMs,
          JSON.stringify(policy),
        )
        .run();
      await env.DB.prepare(
        "INSERT INTO customer_provider_limits VALUES(?,?,?,100000,200000,?) ON CONFLICT(tenant_id,property_id,month) DO NOTHING",
      )
        .bind(
          scope.tenantId,
          scope.propertyId,
          new Date().toISOString().slice(0, 7),
          "2026-10-21-standard-v1",
        )
        .run();
      const dispatcher = new PilotDispatcher(
        env.DB,
        scope,
        (category, approvedConfig, at) =>
          recordedPilotConnector({
            category,
            config: approvedConfig,
            propertyId: scope.propertyId,
            at,
          }),
        async () => {
          await store.expansionScope(body.token!);
        },
      );
      const status = await dispatcher.run(
        hostedAcceptancePilotId,
        body.requestKey ?? "",
      );
      return Response.json(status);
    }
    const connector = (
      category: (typeof marketCategories)[number],
      config: import("../src/customer/expansion-contracts").ExpansionConfiguration,
      at: string,
    ) =>
      recordedPilotConnector({
        category,
        config,
        propertyId: scope.propertyId,
        at,
      });
    const dispatcher = new PilotDispatcher(
      env.DB,
      scope,
      connector,
      async () => {
        await store.expansionScope(body.token!);
      },
    );
    if (body.operation === "status" && body.jobId)
      return Response.json(await dispatcher.status(body.jobId));
    if (body.operation === "snapshot" && body.jobId) {
      const snapshot = await dispatcher.approvedSnapshot(body.jobId);
      return Response.json({
        reviewId: snapshot.reviewId,
        approvalHash: snapshot.approvalHash,
        records: snapshot.market.records.length,
        versions: snapshot.market.records.map((r) => ({
          id: r.id,
          version: r.versions.length,
          evidence: r.evidence.map((e) => e.id),
        })),
      });
    }
    if (body.operation === "review" && body.reviewId) {
      const review = await reviewer.execute(
        { ...scope, dataMode: "synthetic" },
        { operation: "read", reviewId: body.reviewId },
      );
      if (!body.decision || !body.approvalHash)
        return Response.json({
          status: review.status,
          reviewId: review.reviewId,
          approvalHash: review.approvalHash,
          findings: (review.batch as { items: unknown[] }).items.length,
          warning: review.warning,
        });
      const result = await reviewer.execute(
        { ...scope, dataMode: "synthetic" },
        {
          operation: "decide",
          reviewId: body.reviewId,
          approvalHash: body.approvalHash,
          decision: body.decision,
          note: "Synthetic hosted acceptance: evidence and lodging inference reviewed.",
          evidenceReviewed: true,
          lodgingInferenceReviewed: true,
        },
      );
      return Response.json(result);
    }
    return Response.json(
      { error: "Unsupported pilot operation" },
      { status: 400 },
    );
  } catch (error) {
    const code =
      error instanceof Error &&
      /PILOT_|LIVE_DISABLED|SOURCE_|RATE_|BUDGET/.test(error.message)
        ? error.message
        : "PILOT_REQUEST_FAILED";
    return Response.json({ error: code }, { status: 403 });
  }
}
