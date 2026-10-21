import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  CustomerError,
  customerHeaders,
  customerWorkspace,
  httpsOrigin,
} from "./contracts";
export const cookieName = "__Host-scout-customer";
export function customerConfigured() {
  return (
    process.env.SCOUT_CUSTOMER_ENABLED === "true" &&
    !!process.env.SCOUT_CUSTOMER_WORKER_ORIGIN &&
    !!process.env.SCOUT_CUSTOMER_SERVICE_TOKEN
  );
}
export async function broker(command: unknown) {
  if (!customerConfigured())
    throw new CustomerError("Customer access is not configured.");
  try {
    const response = await fetch(
      httpsOrigin(process.env.SCOUT_CUSTOMER_WORKER_ORIGIN!) + "/customer",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SCOUT_CUSTOMER_SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(25000),
        redirect: "error",
        cache: "no-store",
      },
    );
    const body = await response.json();
    if (!response.ok)
      throw new CustomerError(
        [400, 401, 403, 409, 429].includes(response.status) &&
          typeof body.error === "string"
          ? body.error
          : "Customer data is temporarily unavailable.",
        [400, 401, 403, 409, 429].includes(response.status)
          ? response.status
          : 503,
      );
    return body;
  } catch (error) {
    if (error instanceof CustomerError) throw error;
    throw new CustomerError("Customer data is temporarily unavailable.");
  }
}
export async function sessionToken() {
  return (await cookies()).get(cookieName)?.value ?? "";
}
export async function getWorkspace() {
  return customerWorkspace.parse(
    await broker({ operation: "workspace", token: await sessionToken() }),
  );
}
export function rejectQuery(request: Request) {
  if (new URL(request.url).search)
    throw new CustomerError("Unsupported request parameter.", 400);
}
export function requireOrigin(request: Request) {
  // Next can normalize request.url to localhost while retaining the actual Host.
  // Do not use forwarded-host to widen the accepted origin.
  const url = new URL(request.url);
  const expected = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  const origin = request.headers.get("origin"),
    site = request.headers.get("sec-fetch-site");
  if (
    !origin ||
    origin !== expected ||
    (site && site !== "same-origin" && site !== "none")
  )
    throw new CustomerError("Cross-origin request rejected.", 403);
}
export function customerFailure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof CustomerError
          ? error.message
          : error instanceof z.ZodError
            ? "Please check the form values."
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
