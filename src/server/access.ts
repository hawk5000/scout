import { AccessError } from "./repository";
export function demoEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  // This filesystem adapter is never used on cloud deployments, even with an accidental flag.
  return env.SCOUT_DEMO_ENABLED === "true" && !env.VERCEL && !env.VERCEL_ENV;
}
export function assertDemoEnabled() {
  if (!demoEnabled())
    throw new AccessError(
      "Demo access is disabled. Production authentication and entitlement are not connected.",
      503,
    );
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  // Next may normalize request.url to localhost while preserving the actual
  // loopback authority in Host. Never trust forwarded-host to loosen this check.
  const expectedOrigin = `${target.protocol}//${request.headers.get("host") ?? target.host}`;
  if (!origin || origin !== expectedOrigin)
    throw new AccessError("Cross-origin request rejected.");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw new AccessError("Cross-site request rejected.");
}
export function rejectScopeOverride(
  params: URLSearchParams,
  allowed: string[],
) {
  for (const key of params.keys())
    if (!allowed.includes(key))
      throw new AccessError("Unsupported request parameter.", 400);
}
