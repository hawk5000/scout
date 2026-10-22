import { z } from "zod";
import {
  marketCategories,
  marketRecord,
  assessmentSchema,
} from "./market-contracts";
const short = z.string().trim().max(300);
const identity = z
  .object({
    name: short,
    address: short,
    locality: short,
    domain: short.refine(
      (s) => !s || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s),
      "Use a domain without https or a path.",
    ),
    aliases: z.array(short.min(1)).max(20),
    formerNames: z.array(short.min(1)).max(20),
    brand: short,
  })
  .strict();
export const expansionConfiguration = z
  .object({
    own: identity,
    paused: z.boolean().optional(),
    competitors: z
      .array(
        identity.extend({
          id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
          active: z.boolean(),
        }),
      )
      .max(25)
      .refine(
        (items) => items.filter((item) => item.active).length <= 5,
        "Select up to five hotels in your STR comp set.",
      )
      .refine((items) => {
        const active = items.filter((item) => item.active);
        const names = active.map((item) =>
          item.name.trim().toLocaleLowerCase(),
        );
        return new Set(names).size === names.length;
      }, "Each hotel in the comp set must have a different name.")
      .refine(
        (items) =>
          items.every(
            (item) => !item.active || (item.name.trim() && item.address.trim()),
          ),
        "Add a hotel name and address for each selected comp-set hotel.",
      ),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.competitors.map((c) => c.id)).size === v.competitors.length,
    "Duplicate competitor ID.",
  );
export type ExpansionConfiguration = z.infer<typeof expansionConfiguration>;
export const fixtureScenarios = [
  "baseline",
  "quiet",
  "change",
  "partial",
  "failed",
  "ambiguous",
  "cancellation",
] as const;
export const expansionCommand = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("read"),
      briefId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("configure"),
      revision: z.number().int().nonnegative(),
      config: expansionConfiguration,
    })
    .strict(),
  z
    .object({
      action: z.literal("start"),
      requestKey: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/),
      scenario: z.enum(fixtureScenarios),
    })
    .strict(),
  z.object({ action: z.literal("advance"), jobId: z.string().uuid() }).strict(),
]);
export type ExpansionCommand = z.infer<typeof expansionCommand>;
export const outcomeSchema = z.object({
  category: z.enum(marketCategories),
  status: z.enum(["complete", "no-change", "partial", "blocked", "failed"]),
  code: z.string(),
  message: z.string(),
  checkedAt: z.string(),
  lastSuccessAt: z.string().nullable(),
  newIds: z.array(z.string()),
  changedIds: z.array(z.string()),
});
export type Outcome = z.infer<typeof outcomeSchema>;
export const briefSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  version: z.number().int().positive(),
  generatedAt: z.iso.datetime(),
  status: z.enum(["complete", "partial", "no-change"]),
  mode: z.literal("synthetic"),
  fence: z.string(),
  configRevision: z.number(),
  coverage: z.array(outcomeSchema),
  records: z.array(marketRecord.extend({ assessment: assessmentSchema })),
  sections: z.array(
    z.object({
      heading: z.string(),
      items: z.array(
        z.object({
          findingId: z.string(),
          version: z.number().int().positive(),
          evidenceIds: z.array(z.string()).min(1),
          statement: z.string(),
          implication: z.string(),
          unknowns: z.array(z.string()),
          ongoing: z.boolean(),
        }),
      ),
    }),
  ),
  connections: z.array(
    z.object({
      findingIds: z.array(z.string()).min(2),
      explanation: z.string(),
    }),
  ),
  unknowns: z.array(z.string()),
  cost: z.object({
    provider: z.literal("fixture"),
    actualUsd: z.literal(0),
    usedFixtureUnits: z.number(),
    reservedFixtureUnits: z.literal(0),
  }),
});
export type Brief = z.infer<typeof briefSchema>;
export const emptyConfiguration: ExpansionConfiguration = {
  own: {
    name: "",
    address: "",
    locality: "",
    domain: "",
    aliases: [],
    formerNames: [],
    brand: "",
  },
  competitors: [],
};
export const categoryLabels = {
  corporate: "Corporate SCOUT",
  project: "Project SCOUT",
  event: "Event SCOUT",
  competitor: "Competitor SCOUT",
  property: "Property SCOUT",
};
