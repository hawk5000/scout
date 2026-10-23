import {
  BlueprintWorkflow,
  blueprintActions,
} from "../../src/research/blueprint-workflow";
import { z } from "zod";
import {
  CustomerError,
  customerHeaders,
  customerMutation,
  loginInput,
  readJson,
} from "../../src/customer/contracts";
import { SilAuth } from "../../src/customer/sil";
import { CustomerStore, digest, type Database } from "../../src/customer/store";
import { findingStateMutation } from "../../src/customer/market-contracts";
import { MarketIngestion } from "../../src/customer/ingestion";
import { ReviewedImports } from "../../src/customer/reviewed-imports";
import { Expansion, type ExpansionScope } from "../../src/customer/expansion";
import type { ExpansionProvider } from "../../src/customer/expansion-provider";
import { expansionCommand } from "../../src/customer/expansion-contracts";
import { verifyOpenAiConnection } from "../../src/research/openai-web-search";
import {
  OpenAiPilotDispatcher,
  openAiPilotActions,
  type OpenAiPilotAction,
} from "../../src/research/openai-pilot";
export interface Env {
  EXPANSION_FIXTURES?: string;
  REVIEW_ENABLED?: string;
  REVIEW_TOKEN?: string;
  REVIEW_TENANT_ID?: string;
  REVIEW_PROPERTY_ID?: string;
  REVIEW_ACTOR?: string;
  REVIEW_DATA_MODE?: string;
  INGESTION_ENABLED?: string;
  INGESTION_TOKEN?: string;
  INGESTION_TENANT_ID?: string;
  INGESTION_PROPERTY_ID?: string;
  INGESTION_DATA_MODE?: string;
  DB: Database;
  CUSTOMER_ENABLED?: string;
  SERVICE_TOKEN?: string;
  SIL_ORIGIN?: string;
  SIL_SERVICE_TOKEN?: string;
  SIL_APP_KEY?: string;
  /** Cloudflare Worker secret; never set as a plaintext Wrangler/Vercel variable. */
  OPENAI_API_KEY?: string;
}
const command = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("expansion"),
      token: z.string().max(128),
      input: expansionCommand,
    })
    .strict(),
  z
    .object({
      operation: z.literal("finding-state"),
      token: z.string().max(128),
      input: findingStateMutation,
    })
    .strict(),
  z
    .object({
      operation: z.literal("login"),
      input: loginInput,
      networkKey: z.string().min(1).max(200),
    })
    .strict(),
  z
    .object({
      operation: z.enum(["workspace", "logout"]),
      token: z.string().max(128),
    })
    .strict(),
  z
    .object({
      operation: z.literal("update"),
      token: z.string().max(128),
      input: customerMutation,
    })
    .strict(),
  z
    .object({
      operation: z.literal("openai-connection"),
      token: z.string().max(128),
    })
    .strict(),
  z
    .object({
      operation: z.literal("blueprint-workflow"),
      token: z.string().max(128),
      input: blueprintActions,
    })
    .strict(),
  z
    .object({
      operation: z.literal("openai-pilot"),
      token: z.string().max(128),
      input: z.union([
        z.object({ action: z.literal("status") }).strict(),
        openAiPilotActions,
      ]),
    })
    .strict(),
]);
export async function handleCustomer(
  request: Request,
  env: Env,
  transport: typeof fetch = (input, init) => fetch(input, init),
  acceptanceProvider?: (scope: ExpansionScope) => ExpansionProvider,
  openAiFetch: typeof fetch = (input, init) => fetch(input, init),
): Promise<Response> {
  try {
    if (
      env.CUSTOMER_ENABLED !== "true" ||
      !env.DB ||
      !env.SIL_ORIGIN ||
      !env.SIL_SERVICE_TOKEN ||
      env.SIL_APP_KEY !== "scout" ||
      !env.SERVICE_TOKEN ||
      env.SERVICE_TOKEN.length < 32
    )
      throw new CustomerError("Customer access is not configured.");
    if (new URL(request.url).pathname === "/reviews") {
      if (request.method !== "POST" || new URL(request.url).search)
        throw new CustomerError("Not found.", 404);
      if (
        env.REVIEW_ENABLED !== "true" ||
        !env.REVIEW_TOKEN ||
        env.REVIEW_TOKEN.length < 32 ||
        env.REVIEW_TOKEN === env.SERVICE_TOKEN ||
        env.REVIEW_TOKEN === env.INGESTION_TOKEN ||
        !env.REVIEW_TENANT_ID ||
        !env.REVIEW_PROPERTY_ID ||
        !env.REVIEW_ACTOR ||
        !["reviewed", "synthetic"].includes(env.REVIEW_DATA_MODE ?? "")
      )
        throw new CustomerError("Reviewed imports are disabled.", 403);
      if (
        (await digest(request.headers.get("authorization") ?? "")) !==
        (await digest(`Bearer ${env.REVIEW_TOKEN}`))
      )
        throw new CustomerError("Access denied.", 403);
      const result = await new ReviewedImports(env.DB).execute(
        {
          tenantId: env.REVIEW_TENANT_ID,
          propertyId: env.REVIEW_PROPERTY_ID,
          actor: env.REVIEW_ACTOR,
          dataMode: env.REVIEW_DATA_MODE as "reviewed" | "synthetic",
        },
        await readJson(request, 256000),
      );
      return Response.json(result, { headers: customerHeaders });
    }
    if (new URL(request.url).pathname === "/ingestion") {
      if (request.method !== "POST" || new URL(request.url).search)
        throw new CustomerError("Not found.", 404);
      if (
        env.INGESTION_ENABLED !== "true" ||
        !env.INGESTION_TOKEN ||
        env.INGESTION_TOKEN.length < 32 ||
        env.INGESTION_TOKEN === env.SERVICE_TOKEN ||
        !env.INGESTION_TENANT_ID ||
        !env.INGESTION_PROPERTY_ID ||
        !["synthetic", "reviewed"].includes(env.INGESTION_DATA_MODE ?? "")
      )
        throw new CustomerError("Ingestion is disabled.", 403);
      if (
        (await digest(request.headers.get("authorization") ?? "")) !==
        (await digest(`Bearer ${env.INGESTION_TOKEN}`))
      )
        throw new CustomerError("Access denied.", 403);
      if (env.INGESTION_DATA_MODE === "reviewed")
        throw new CustomerError(
          "Reviewed findings require staged approval through /reviews.",
          403,
        );
      const result = await new MarketIngestion(env.DB).ingest(
        {
          tenantId: env.INGESTION_TENANT_ID,
          propertyId: env.INGESTION_PROPERTY_ID,
          actor: "scoped-ingestion-service",
          dataMode: env.INGESTION_DATA_MODE as "synthetic" | "reviewed",
        },
        await readJson(request, 256000),
      );
      return Response.json(result, { headers: customerHeaders });
    }
    if (
      request.method !== "POST" ||
      new URL(request.url).pathname !== "/customer" ||
      new URL(request.url).search
    )
      throw new CustomerError("Not found.", 404);
    const supplied = request.headers.get("authorization") ?? "";
    if (
      (await digest(supplied)) !== (await digest(`Bearer ${env.SERVICE_TOKEN}`))
    )
      throw new CustomerError("Access denied.", 403);
    const input = command.parse(await readJson(request));
    const store = new CustomerStore(
      env.DB,
      new SilAuth(
        {
          origin: env.SIL_ORIGIN,
          token: env.SIL_SERVICE_TOKEN,
          appKey: env.SIL_APP_KEY,
        },
        transport,
      ),
    );
    if (input.operation === "expansion") {
      const scope = await store.expansionScope(input.token);
      const result = await new Expansion(
        env.DB,
        scope,
        env.EXPANSION_FIXTURES === "true",
        Date.now,
        acceptanceProvider?.(scope),
      ).execute(input.input);
      return Response.json(result, { headers: customerHeaders });
    }
    if (input.operation === "openai-connection") {
      const scope = await store.expansionScope(input.token);
      if (!scope.manualResearchAllowed)
        throw new CustomerError(
          "SIL permission for SCOUT manual research is required.",
          403,
        );
      const status = await verifyOpenAiConnection(
        env.OPENAI_API_KEY,
        openAiFetch,
      );
      return Response.json({ status }, { headers: customerHeaders });
    }
    if (input.operation === "blueprint-workflow") {
      const scope = await store.expansionScope(input.token);
      const result = await new BlueprintWorkflow(
        env.DB,
        scope,
        env.OPENAI_API_KEY,
        () => store.expansionScope(input.token),
        openAiFetch,
      ).execute(input.input);
      return Response.json(result, { headers: customerHeaders });
    }
    if (input.operation === "openai-pilot") {
      if (input.input.action !== "status")
        throw new CustomerError(
          "Use the blueprint-first workflow with a new plan-specific approval. Legacy pilot dispatch is closed.",
          409,
        );
      const scope = await store.expansionScope(input.token);
      if (input.input.action !== "status" && !scope.manualResearchAllowed)
        throw new CustomerError(
          "SIL permission for SCOUT manual research is required.",
          403,
        );
      const dispatcher = new OpenAiPilotDispatcher(
        env.DB,
        scope,
        env.OPENAI_API_KEY,
        () => store.expansionScope(input.token),
        openAiFetch,
      );
      const result =
        input.input.action === "status"
          ? await dispatcher.status()
          : await dispatcher.execute(input.input as OpenAiPilotAction);
      return Response.json(result, { headers: customerHeaders });
    }
    const result =
      input.operation === "login"
        ? await store.login(
            input.input.email,
            input.input.password,
            input.networkKey,
          )
        : input.operation === "logout"
          ? await store.logout(input.token)
          : input.operation === "finding-state"
            ? await store.findingState(input.token, input.input)
            : input.operation === "update"
              ? await store.update(input.token, input.input)
              : await store.workspace(input.token);
    return Response.json(result, { headers: customerHeaders });
  } catch (error) {
    if (String(error).includes("review_retention_limit"))
      error = new CustomerError(
        "Review retention limit reached. Archive review is required before more imports.",
        413,
      );
    return Response.json(
      {
        error:
          error instanceof CustomerError
            ? error.message
            : error instanceof z.ZodError
              ? "Invalid request."
              : "Customer data is temporarily unavailable.",
      },
      {
        status:
          error instanceof CustomerError
            ? error.status
            : error instanceof z.ZodError
              ? 400
              : 503,
        headers: customerHeaders,
      },
    );
  }
}
export default {
  fetch: (request: Request, env: Env) => handleCustomer(request, env),
};
