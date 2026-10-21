import { z } from "zod";
import { CustomerError, httpsOrigin } from "./contracts";
// These are the existing SIL customer-auth contracts, not a SCOUT-specific endpoint.
const identity = z.object({
  tenantId: z.string().min(1).max(160),
  propertyId: z.string().min(1).max(160),
  userId: z.string().min(1).max(160),
  appKey: z.string().min(1).max(80),
  credentialVersion: z.number().int().positive(),
});
const loginResult = identity.extend({
  loginAllowed: z.literal(true),
  accessAllowed: z.literal(true),
  mustChangePassword: z.literal(false),
  propertyName: z.string().min(1).max(300),
});
const statusResult = identity.extend({
  sessionValid: z.literal(true),
  mustChangePassword: z.literal(false),
});
export type Identity = z.infer<typeof identity> & { sessionIssuedAt: string };
export interface AuthProvider {
  login(
    email: string,
    password: string,
  ): Promise<Identity & { propertyName: string }>;
  validate(session: Identity): Promise<void>;
}
export class SilAuth implements AuthProvider {
  constructor(
    private config: { origin: string; token: string; appKey: string },
    private transport: typeof fetch = fetch,
  ) {}
  private async call(path: string, input: unknown) {
    try {
      const response = await this.transport(
        httpsOrigin(this.config.origin) + path,
        {
          method: "POST",
          redirect: "manual",
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        console.error("scout_auth_transport", { status: response.status });
        throw new CustomerError(
          "Account verification is temporarily unavailable.",
        );
      }
      return await response.json();
    } catch (error) {
      console.error("scout_auth_unavailable", {
        name: error instanceof Error ? error.name : "unknown",
      });
      throw new CustomerError(
        "Account verification is temporarily unavailable.",
      );
    }
  }
  async login(email: string, password: string) {
    const issuedAt = new Date().toISOString();
    const result = loginResult.safeParse(
      await this.call("/api/apps/customer-auth/login", {
        email,
        password,
        appKey: this.config.appKey,
      }),
    );
    if (!result.success || result.data.appKey !== this.config.appKey)
      throw new CustomerError(
        "Sign-in was not approved. Check your account access with your administrator.",
        401,
      );
    return { ...result.data, sessionIssuedAt: issuedAt };
  }
  async validate(session: Identity) {
    if (session.appKey !== this.config.appKey)
      throw new CustomerError("Please sign in again.", 401);
    const result = statusResult.safeParse(
      await this.call("/api/apps/customer-auth/session-status", {
        ...identity.parse(session),
        sessionIssuedAt: session.sessionIssuedAt,
      }),
    );
    if (
      !result.success ||
      ["tenantId", "propertyId", "userId", "appKey", "credentialVersion"].some(
        (k) =>
          result.data[k as keyof typeof result.data] !==
          session[k as keyof Identity],
      )
    )
      throw new CustomerError(
        "Your session is no longer valid. Please sign in again.",
        401,
      );
  }
}
