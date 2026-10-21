import { z } from "zod";
import { scenarioNames } from "./contracts";

export const subscriptionCommand = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("configure"),
      entitled: z.boolean(),
      active: z.boolean(),
      runCredits: z.number().int().min(0).max(1500),
      monthCredits: z.number().int().min(0).max(10000),
    })
    .strict(),
  z.object({ action: z.literal("baseline") }).strict(),
  z.object({ action: z.literal("due") }).strict(),
  z
    .object({
      action: z.literal("enqueue"),
      scenario: z.enum(scenarioNames).exclude(["baseline"]),
      key: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
    })
    .strict(),
]);
export type SubscriptionCommand = z.infer<typeof subscriptionCommand>;
export type SubscriptionView = {
  controls: {
    entitled: boolean;
    active: boolean;
    runCredits: number;
    monthCredits: number;
  };
  month: string;
  usage: {
    reconciledCredits: number;
    heldCredits: number;
    actualChargedUsd: 0;
  };
  jobs: {
    cycle_key: string;
    scenario: string;
    state: string;
    checkpoint: string;
    attempts: number;
    error: string | null;
    result: string | null;
    summary: string | null;
  }[];
  deliveries: {
    recipient: string;
    cycle_key: string;
    state: string;
    finding_id: string;
    version_id: string;
    preview: string;
  }[];
};
