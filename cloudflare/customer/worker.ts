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
export interface Env {
  DB: Database;
  CUSTOMER_ENABLED?: string;
  SERVICE_TOKEN?: string;
  SIL_ORIGIN?: string;
  SIL_SERVICE_TOKEN?: string;
  SIL_APP_KEY?: string;
}
const command = z.discriminatedUnion("operation", [
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
]);
export async function handleCustomer(
  request: Request,
  env: Env,
  transport: typeof fetch = (input, init) => fetch(input, init),
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
    const result =
      input.operation === "login"
        ? await store.login(
            input.input.email,
            input.input.password,
            input.networkKey,
          )
        : input.operation === "logout"
          ? await store.logout(input.token)
          : input.operation === "update"
            ? await store.update(input.token, input.input)
            : await store.workspace(input.token);
    return Response.json(result, { headers: customerHeaders });
  } catch (error) {
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
