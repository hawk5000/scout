import { z } from "zod";

export const categories = ["corporate", "project", "event"] as const;
export type Category = (typeof categories)[number];
export const categoryNames: Record<Category, string> = {
  corporate: "Corporate SCOUT",
  project: "Project SCOUT",
  event: "Event SCOUT",
};
export const categoryDescriptions: Record<Category, string> = {
  corporate:
    "Employers, expansions and the local activity that may support recurring business travel.",
  project:
    "Construction, infrastructure and temporary activity that may bring visiting personnel.",
  event:
    "Tournaments, conferences and gatherings with potential overnight visitors.",
};
const text = z.string().trim().min(1).max(300);
const items = z.array(z.string().trim().min(1).max(200)).max(30);
export const profileSchema = z
  .object({
    name: text,
    website: z
      .url()
      .refine((v) => /^https?:\/\//.test(v), "Use an HTTP or HTTPS website."),
    address: text,
    timezone: text.refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid timezone."),
    confirmed: z.boolean(),
    marketCenter: text,
    radiusMiles: z.number().min(1).max(100),
    includedPlaces: items.min(1),
    excludedPlaces: items,
    categories: z
      .array(z.enum(categories))
      .min(1)
      .max(3)
      .refine((v) => new Set(v).size === v.length),
    priorities: items,
    exclusions: items,
    recipients: z.array(z.email().max(254)).max(10),
    scheduleDays: z
      .array(
        z.enum([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ]),
      )
      .length(2)
      .refine((v) => v[0] !== v[1], "Choose two different days."),
    scheduleTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export interface Evidence {
  id: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  retrievedAt: string;
  lastVerifiedAt: string | null;
  claim: string;
  verification: "fictional" | "unavailable";
}
export interface Finding {
  id: string;
  entityId: string;
  category: Category;
  categories?: Category[];
  title: string;
  summary: string;
  location: string;
  start: string | null;
  end: string | null;
  status:
    | "Announced"
    | "Active"
    | "Confirmed"
    | "Proposed"
    | "Canceled"
    | "Completed";
  organizations: string[];
  publicContact: string | null;
  firstSeenAt: string;
  lastCheckedAt: string;
  lastVerifiedAt: string | null;
  quality:
    "Sample evidence" | "Needs verification" | "Stale" | "Conflicting evidence";
  evidence: Evidence[];
  versions: {
    id: string;
    at: string;
    summary: string;
    material: boolean;
    before: string | null;
    after: string;
    evidenceIds: string[];
  }[];
}
export interface Assessment {
  findingId: string;
  inference: string;
  rationale: string;
  unknowns: string[];
  version: number;
}
export interface PrivateState {
  saved: boolean;
  dismissed: boolean;
}
export type FindingView = Finding & Assessment & PrivateState;
export interface ResearchRun {
  id: string;
  type: "baseline" | "update";
  cycleKey: string;
  status: "Completed" | "Partial" | "Needs attention";
  at: string;
  newIds: string[];
  changedIds: string[];
  warnings: string[];
  categories: Category[];
  summary: string;
  checkpoint: string;
  simulated: true;
  actualCostUsd: null;
  engine?: "synthetic-v1";
  reviewItems?: { label: string; reason: string; sourceUrls: string[] }[];
  scenario?: string;
  coverage?: Record<Category, string>;
  usage?: {
    rateCard: string;
    actualChargedUsd: 0;
    estimatedCredits: number;
    reconciledCredits: number;
    heldCredits: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    searchCalls: number;
    toolCalls: number;
  };
}
export interface Workspace {
  profile: Profile;
  findings: FindingView[];
  runs: ResearchRun[];
  coverage: Record<Category, { notes: string; paused: boolean }>;
  setupStep: number;
  mode: "demo";
}
export const filtersSchema = z
  .object({
    q: z.string().max(200).default(""),
    category: z.enum(["all", ...categories]).default("all"),
    state: z.enum(["all", "saved", "dismissed", "visible"]).default("visible"),
    quality: z
      .enum([
        "all",
        "Sample evidence",
        "Needs verification",
        "Stale",
        "Conflicting evidence",
      ])
      .default("all"),
  })
  .strict();
export type Filters = z.infer<typeof filtersSchema>;
export function filterFindings(findings: FindingView[], filters: Filters) {
  const q = filters.q.toLocaleLowerCase();
  return findings.filter(
    (f) =>
      (filters.category === "all" ||
        (f.categories ?? [f.category]).includes(filters.category)) &&
      (filters.quality === "all" || f.quality === filters.quality) &&
      (filters.state === "all" ||
        (filters.state === "visible" ? !f.dismissed : f[filters.state])) &&
      [f.title, f.summary, f.location, ...f.organizations]
        .join(" ")
        .toLocaleLowerCase()
        .includes(q),
  );
}
export const mutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("state"),
      findingId: text,
      saved: z.boolean(),
      dismissed: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("profile"), profile: profileSchema }).strict(),
  z
    .object({
      action: z.literal("coverage"),
      category: z.enum(categories),
      notes: z.string().trim().min(1).max(2000),
      paused: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("setup"),
      step: z.number().int().min(0).max(5),
    })
    .strict(),
]);
export type Mutation = z.infer<typeof mutationSchema>;
