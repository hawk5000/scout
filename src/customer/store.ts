import {
  CustomerError,
  customerWorkspace,
  type CustomerMutation,
} from "./contracts";
import { storedMarket, findingStateMutation } from "./market-contracts";
import type { AuthProvider, Identity } from "./sil";
// Small structural subset of the D1 binding; SQLite test adapter implements the same contract.
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
interface SessionRow {
  token_hash: string;
  tenant_id: string;
  property_id: string;
  user_id: string;
  app_key: string;
  credential_version: number;
  issued_at: string;
  expires_at: number;
}
export class CustomerStore {
  constructor(
    private db: Database,
    private auth: AuthProvider,
    private now: () => number = Date.now,
  ) {}
  async login(email: string, password: string, networkKey: string) {
    // Two durable fixed-window limits: per account and per trusted network address.
    for (const key of [
      `account:${email.toLowerCase()}`,
      `network:${networkKey}`,
    ]) {
      const hash = await digest(key),
        now = this.now();
      const row = await this.db
        .prepare(
          `INSERT INTO customer_login_limits(key_hash,attempts,window_end) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_end<=? THEN 1 ELSE attempts+1 END,window_end=CASE WHEN window_end<=? THEN excluded.window_end ELSE window_end END RETURNING attempts`,
        )
        .bind(hash, now + 900000, now, now)
        .first<{ attempts: number }>();
      if (!row || row.attempts > (key.startsWith("account:") ? 10 : 60))
        throw new CustomerError(
          "Too many sign-in attempts. Try again later.",
          429,
        );
    }
    const user = await this.auth.login(email, password);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const hash = await digest(token),
      expires = this.now() + 8 * 3600000;
    const result = await this.db
      .prepare(
        `INSERT INTO customer_sessions(token_hash,tenant_id,property_id,user_id,app_key,credential_version,issued_at,expires_at)
   SELECT ?,m.tenant_id,m.property_id,m.user_id,?,?,?,? FROM customer_memberships m JOIN customer_properties p USING(tenant_id,property_id)
   WHERE m.tenant_id=? AND m.property_id=? AND m.user_id=? AND m.active=1 AND p.active=1 RETURNING token_hash`,
      )
      .bind(
        hash,
        user.appKey,
        user.credentialVersion,
        user.sessionIssuedAt,
        expires,
        user.tenantId,
        user.propertyId,
        user.userId,
      )
      .first<{ token_hash: string }>();
    if (!result)
      throw new CustomerError(
        "Sign-in was not approved. Check your account access with your administrator.",
        401,
      );
    // Expired session/rate-limit cleanup contains no customer workspace deletion.
    await this.db
      .prepare("DELETE FROM customer_sessions WHERE expires_at<=?")
      .bind(this.now())
      .run();
    await this.db
      .prepare("DELETE FROM customer_login_limits WHERE window_end<=?")
      .bind(this.now())
      .run();
    return { token, expiresAt: expires };
  }
  private async session(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new CustomerError("Please sign in.", 401);
    const row = await this.db
      .prepare(
        `SELECT s.* FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=? AND s.expires_at>? AND m.active=1 AND p.active=1`,
      )
      .bind(await digest(token), this.now())
      .first<SessionRow>();
    if (!row) throw new CustomerError("Please sign in again.", 401);
    const identity: Identity = {
      tenantId: row.tenant_id,
      propertyId: row.property_id,
      userId: row.user_id,
      appKey: row.app_key,
      credentialVersion: row.credential_version,
      sessionIssuedAt: row.issued_at,
    };
    try {
      await this.auth.validate(identity);
    } catch (e) {
      if (e instanceof CustomerError && e.status === 401)
        await this.logout(token);
      throw e;
    }
    return row;
  }
  async expansionScope(token: string) {
    const row = await this.session(token);
    const workspace = await this.read(row);
    return {
      tenantId: row.tenant_id,
      propertyId: row.property_id,
      actor: row.user_id,
      sessionHash: row.token_hash,
      role: workspace.role,
    };
  }
  async logout(token: string) {
    await this.db
      .prepare("DELETE FROM customer_sessions WHERE token_hash=?")
      .bind(await digest(token))
      .run();
    return { ok: true };
  }
  private async read(row: SessionRow) {
    const found = await this.db
      .prepare(
        `SELECT p.property_name,p.profile_json,p.coverage_json,p.revision,m.role FROM customer_properties p JOIN customer_memberships m USING(tenant_id,property_id) JOIN customer_sessions s USING(tenant_id,property_id,user_id) WHERE s.token_hash=? AND s.expires_at>? AND p.active=1 AND m.active=1`,
      )
      .bind(row.token_hash, this.now())
      .first<{
        property_name: string;
        profile_json: string | null;
        coverage_json: string;
        revision: number;
        role: string;
      }>();
    if (!found) throw new CustomerError("Please sign in again.", 401);
    const market = await this.db
      .prepare(
        `SELECT m.document_json,m.data_mode,m.revision,
      (SELECT json_group_array(json_object('id',f.finding_id,'saved',f.saved,'dismissed',f.dismissed,'revision',f.revision)) FROM customer_finding_states f WHERE f.tenant_id=m.tenant_id AND f.property_id=m.property_id) AS states
      FROM customer_markets m JOIN customer_properties p USING(tenant_id,property_id)
      WHERE m.tenant_id=? AND m.property_id=? AND p.active=1 AND EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships a USING(tenant_id,property_id,user_id) WHERE s.token_hash=? AND s.expires_at>? AND a.active=1)`,
      )
      .bind(row.tenant_id, row.property_id, row.token_hash, this.now())
      .first<{
        document_json: string;
        data_mode: string;
        revision: number;
        states: string;
      }>();
    const document = market
      ? storedMarket.parse(JSON.parse(market.document_json))
      : { records: [], assessments: {}, runs: [] };
    const states: {
      id: string;
      saved: number;
      dismissed: number;
      revision: number;
    }[] = market ? JSON.parse(market.states) : [];
    return customerWorkspace.parse({
      mode: "customer",
      propertyName: found.property_name,
      role: found.role,
      revision: found.revision,
      profile: found.profile_json ? JSON.parse(found.profile_json) : null,
      coverage: JSON.parse(found.coverage_json),
      findings: document.records.map((f) => {
        const state = states.find((s) => s.id === f.id);
        return {
          ...f,
          assessment: document.assessments[f.id],
          dataMode: market!.data_mode,
          saved: !!state?.saved,
          dismissed: !!state?.dismissed,
          stateRevision: state?.revision ?? 0,
        };
      }),
      runs: document.runs,
      marketRevision: market?.revision ?? 0,
      marketMode: market?.data_mode ?? null,
      researchEnabled: false,
      paidCallsEnabled: false,
      notificationsEnabled: false,
    });
  }
  async workspace(token: string) {
    return this.read(await this.session(token));
  }
  async findingState(token: string, raw: unknown) {
    const input = findingStateMutation.parse(raw);
    const row = await this.session(token),
      current = await this.read(row);
    if (current.role === "viewer")
      throw new CustomerError("Your account has read-only access.", 403);
    if (!current.findings.some((f) => f.id === input.findingId))
      throw new CustomerError("Finding unavailable.", 404);
    const result = await this.db
      .prepare(
        `INSERT INTO customer_finding_states(tenant_id,property_id,finding_id,saved,dismissed,revision,actor,at)
      SELECT m.tenant_id,m.property_id,?,?,?,1,?,? FROM customer_markets m JOIN customer_properties p USING(tenant_id,property_id)
      WHERE m.tenant_id=? AND m.property_id=? AND p.active=1
      AND EXISTS(SELECT 1 FROM json_each(m.document_json,'$.records') j WHERE json_extract(j.value,'$.id')=?)
      AND COALESCE((SELECT f.revision FROM customer_finding_states f WHERE f.tenant_id=m.tenant_id AND f.property_id=m.property_id AND f.finding_id=?),0)=?
      AND EXISTS(SELECT 1 FROM customer_memberships a JOIN customer_sessions s USING(tenant_id,property_id,user_id) WHERE a.tenant_id=m.tenant_id AND a.property_id=m.property_id AND a.active=1 AND a.role IN('editor','admin') AND s.token_hash=? AND s.expires_at>?)
      ON CONFLICT(tenant_id,property_id,finding_id) DO UPDATE SET saved=excluded.saved,dismissed=excluded.dismissed,revision=customer_finding_states.revision+1,actor=excluded.actor,at=excluded.at WHERE customer_finding_states.revision=? RETURNING revision`,
      )
      .bind(
        input.findingId,
        Number(input.saved),
        Number(input.dismissed),
        row.user_id,
        new Date(this.now()).toISOString(),
        row.tenant_id,
        row.property_id,
        input.findingId,
        input.findingId,
        input.revision,
        row.token_hash,
        this.now(),
        input.revision,
      )
      .first<{ revision: number }>();
    if (!result)
      throw new CustomerError(
        "Finding or access changed. Reload before saving.",
        409,
      );
    return this.read(row);
  }
  async update(token: string, input: CustomerMutation) {
    const row = await this.session(token),
      current = await this.read(row);
    if (current.role === "viewer")
      throw new CustomerError("Your account has read-only access.", 403);
    // Optimistic revision plus live local membership/session predicates: concurrent saves never silently overwrite.
    const result = await this.db
      .prepare(
        `UPDATE customer_properties SET profile_json=?,coverage_json=?,revision=revision+1,last_actor=?,updated_at=? WHERE tenant_id=? AND property_id=? AND revision=? AND active=1 AND EXISTS(SELECT 1 FROM customer_memberships m JOIN customer_sessions s USING(tenant_id,property_id,user_id) WHERE m.tenant_id=customer_properties.tenant_id AND m.property_id=customer_properties.property_id AND m.active=1 AND m.role IN('editor','admin') AND s.token_hash=? AND s.expires_at>?) RETURNING revision`,
      )
      .bind(
        JSON.stringify(input.profile),
        JSON.stringify(input.coverage),
        row.user_id,
        new Date(this.now()).toISOString(),
        row.tenant_id,
        row.property_id,
        input.revision,
        row.token_hash,
        this.now(),
      )
      .first<{ revision: number }>();
    if (!result)
      throw new CustomerError(
        "Your access or hotel profile changed. Reload before saving again.",
        409,
      );
    return this.read(row);
  }
}
