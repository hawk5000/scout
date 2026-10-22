import type { Database } from "../src/customer/store";
import type { ExpansionScope } from "../src/customer/expansion";
import type { ExpansionProvider } from "../src/customer/expansion-provider";
import type { ExpansionConfiguration } from "../src/customer/expansion-contracts";
import type {
  MarketCategory,
  Ingestion,
} from "../src/customer/market-contracts";
import type { PinnedFixtureConnector } from "../src/research/pilot-transport";
import { fixtureItems } from "../src/customer/expansion-fixtures";
import { PreparedExpansionProvider } from "../src/research/prepared-provider";
import { ProviderLedger } from "../src/research/provider-ledger";
import {
  BoundedSources,
  rateCard,
  sourceUrl,
  SourceError,
  type SourceTransport,
} from "../src/research/source-adapters";

export async function recordedPilotConnector(input: {
  category: MarketCategory;
  config: ExpansionConfiguration;
  propertyId: string;
  at: string;
}): Promise<PinnedFixtureConnector> {
  const items = await fixtureItems(
    input.category,
    input.config,
    input.propertyId,
    "baseline",
    input.at,
  );
  const json = (value: unknown) => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(value),
  });
  return {
    mode: "synthetic",
    async resolve() {
      return ["93.184.216.34"];
    },
    async open(request) {
      let value: unknown,
        contentType = "application/json";
      if (request.credential === "brave")
        value = {
          web: {
            results: items.flatMap((i) =>
              i.candidate.sources.map((s) => ({
                title: i.candidate.name,
                url: s.url,
              })),
            ),
          },
        };
      else if (request.credential === "openai")
        value = {
          status: "completed",
          usage: { input_tokens: 100, output_tokens: 100 },
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    items: items.map(({ receipts: _, context, ...i }) => ({
                      ...i,
                      context: context ?? null,
                    })),
                  }),
                },
              ],
            },
          ],
        };
      else {
        contentType = "text/plain";
        const item = items.find((i) =>
          i.candidate.sources.some(
            (s) => sourceUrl(s.url, ["sources.example"]) === request.url,
          ),
        );
        if (!item)
          return {
            status: 404,
            contentType,
            chunks: (async function* () {
              yield new TextEncoder().encode("Fictional source missing");
            })(),
          };
        const subject =
          input.category === "competitor"
            ? input.config.competitors.find(
                (c) => c.id === item.context?.subjectId,
              )
            : input.config.own;
        value = [
          "FICTIONAL SYNTHETIC PILOT SOURCE",
          ...item.candidate.sources.flatMap((s) =>
            s.claims.map((c) => c.quote),
          ),
          item.context?.excerpt ?? "",
          subject?.name ?? "",
          subject?.address ?? "",
        ].join("\n");
      }
      const response =
        contentType === "text/plain"
          ? { status: 200, contentType, body: String(value) }
          : json(value);
      return {
        status: response.status,
        contentType: response.contentType,
        chunks: (async function* () {
          yield new TextEncoder().encode(response.body);
        })(),
      };
    },
  };
}

// Imported ONLY by the expiring, database-marked acceptance entrypoint. These
// provider-shaped responses are generated locally; no fetch or credentials exist.
export function recordedAcceptanceProvider(
  db: Database,
  scope: ExpansionScope,
): ExpansionProvider {
  if (
    !scope.tenantId.startsWith("fixture_") ||
    !scope.propertyId.startsWith("fixture_")
  )
    throw new SourceError("LIVE_DISABLED");
  return {
    mode: "synthetic",
    async research(input) {
      if (!input.jobId) throw new SourceError("JOB_REQUIRED");
      const month = input.at.slice(0, 7);
      await db
        .prepare(
          "INSERT INTO customer_provider_limits(tenant_id,property_id,month,job_limit_micros,monthly_limit_micros,rate_version) VALUES(?,?,?,100000,2000000,?) ON CONFLICT(tenant_id,property_id,month) DO NOTHING",
        )
        .bind(scope.tenantId, scope.propertyId, month, rateCard.version)
        .run();
      const items = await fixtureItems(
        input.category,
        input.config,
        input.propertyId,
        input.scenario,
        input.at,
      );
      const transport: SourceTransport = {
        mode: "synthetic",
        async exchange(request) {
          if (
            input.scenario === "failed" ||
            (input.scenario === "partial" && input.category === "competitor")
          )
            return {
              status: 403,
              contentType: "application/json",
              body: '{"error":"Synthetic source permission denied"}',
            };
          const json = (value: unknown) => ({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(value),
          });
          if (request.credential === "brave")
            return json({
              web: {
                results: items.flatMap((i) =>
                  i.candidate.sources.map((s) => ({
                    title: i.candidate.name,
                    url: s.url,
                  })),
                ),
              },
            });
          if (request.credential === "openai")
            return json({
              status: "completed",
              usage: { input_tokens: 100, output_tokens: 100 },
              output: [
                {
                  type: "message",
                  content: [
                    {
                      type: "output_text",
                      text: JSON.stringify({
                        items: items.map(
                          ({ receipts: _, context, ...item }) => ({
                            ...item,
                            context: context ?? null,
                          }),
                        ),
                      }),
                    },
                  ],
                },
              ],
            });
          const item = items.find((i) =>
            i.candidate.sources.some(
              (s) => sourceUrl(s.url, ["sources.example"]) === request.url,
            ),
          );
          if (!item)
            return {
              status: 404,
              contentType: "text/plain",
              body: "Synthetic page unavailable",
            };
          const subject =
            input.category === "competitor"
              ? input.config.competitors.find(
                  (c) => c.id === item.context?.subjectId,
                )
              : input.config.own;
          return {
            status: 200,
            contentType: "text/plain",
            body: [
              "FICTIONAL SYNTHETIC PROVIDER RESPONSE",
              ...item.candidate.sources.flatMap((s) =>
                s.claims.map((c) => c.quote),
              ),
              item.context?.excerpt ?? "",
              subject?.name ?? "",
              input.scenario === "ambiguous" ? "" : (subject?.address ?? ""),
            ].join("\n"),
          };
        },
      };
      return new PreparedExpansionProvider(
        new BoundedSources(
          transport,
          new ProviderLedger(db, { ...scope, jobId: input.jobId, month }),
        ),
        (i) => ({
          query: i.category,
          hosts: ["sources.example"],
          requiredUrls: [],
        }),
      ).research(input);
    },
  };
}
