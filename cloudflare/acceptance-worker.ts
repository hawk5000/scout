import { handleCustomer, type Env } from "./customer/worker";
import { digest } from "../src/customer/store";
// Dedicated acceptance entrypoint. Never imported by the production Worker.
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
    );
  },
};
