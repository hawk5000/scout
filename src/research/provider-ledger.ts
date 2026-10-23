import type { Database } from "../customer/store";
import type { CallLedger } from "./source-adapters";
import { SourceError, rateCard } from "./source-adapters";

// No route creates spending policies. Pass B uses isolated fixtures only. A future
// authorized live dispatcher must supply server-derived scope, entitlement and lease.
export class ProviderLedger implements CallLedger {
  constructor(
    private db: Database,
    private scope: {
      tenantId: string;
      propertyId: string;
      jobId: string;
      month: string;
    },
    allowLive = false,
    private pilotFence?: { lease: string; step: number; retry?: boolean },
  ) {
    if (
      ((!scope.tenantId.startsWith("fixture_") ||
        !scope.propertyId.startsWith("fixture_")) &&
        !allowLive) ||
      scope.tenantId.startsWith("fixture_") !==
        scope.propertyId.startsWith("fixture_") ||
      !/^\d{4}-\d{2}$/.test(scope.month)
    )
      throw new SourceError("LIVE_DISABLED");
  }
  async reserve(key: string, maximumMicros: number) {
    if (
      !key ||
      key.length > 200 ||
      !Number.isSafeInteger(maximumMicros) ||
      maximumMicros < 0
    )
      throw new SourceError("RESERVATION_INVALID");
    const s = this.scope;
    try {
      const row = await this.db
        .prepare(
          "INSERT INTO customer_provider_calls(tenant_id,property_id,month,job_id,call_key,maximum_micros,accounted_micros,state) SELECT ?,?,?,?,?,?,?,'reserved' WHERE EXISTS(SELECT 1 FROM customer_provider_limits WHERE tenant_id=? AND property_id=? AND month=? AND rate_version=?)" +
            (this.pilotFence
              ? ` AND EXISTS(SELECT 1 FROM ${this.pilotFence.retry ? "customer_openai_retry_jobs" : "customer_openai_pilot_jobs"} WHERE tenant_id=? AND property_id=? AND id=? AND lease=? AND step=? AND state='running' AND lease_until>CAST(strftime('%s','now') AS INTEGER)*1000)`
              : "") +
            " RETURNING call_key",
        )
        .bind(
          s.tenantId,
          s.propertyId,
          s.month,
          s.jobId,
          key,
          maximumMicros,
          maximumMicros,
          s.tenantId,
          s.propertyId,
          s.month,
          rateCard.version,
          ...(this.pilotFence
            ? [
                s.tenantId,
                s.propertyId,
                s.jobId,
                this.pilotFence.lease,
                this.pilotFence.step,
              ]
            : []),
        )
        .first();
      return !!row;
    } catch {
      return false;
    } // Duplicate, missing policy and exhausted caps all stop dispatch.
  }
  async settle(key: string, actualMicros: number | null) {
    const s = this.scope;
    if (
      actualMicros !== null &&
      (!Number.isSafeInteger(actualMicros) || actualMicros < 0)
    )
      throw new SourceError("USAGE_INVALID");
    await this.db
      .prepare(
        "UPDATE customer_provider_calls SET accounted_micros=COALESCE(?,maximum_micros),state=? WHERE tenant_id=? AND property_id=? AND job_id=? AND call_key=? AND state='reserved'",
      )
      .bind(
        actualMicros,
        actualMicros === null ? "unknown" : "known",
        s.tenantId,
        s.propertyId,
        s.jobId,
        key,
      )
      .run();
  }
}
