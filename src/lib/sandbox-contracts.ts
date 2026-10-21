import { z } from "zod";
import { mutationSchema, type Workspace } from "./contracts";
import { replaySchema } from "../research/contracts";
import {
  subscriptionCommand,
  type SubscriptionView,
} from "../research/subscription-contracts";
export const sandboxCommand = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mutation"), input: mutationSchema }).strict(),
  z.object({ kind: z.literal("research"), input: replaySchema }).strict(),
  z
    .object({ kind: z.literal("subscription"), input: subscriptionCommand })
    .strict(),
  z.object({ kind: z.literal("worker") }).strict(),
]);
export const journalSchema = z
  .object({
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    events: z
      .array(
        z.object({ at: z.iso.datetime(), command: sandboxCommand }).strict(),
      )
      .max(128),
  })
  .strict();
export const sandboxRequest = z
  .object({
    journal: journalSchema.nullable(),
    command: sandboxCommand.optional(),
  })
  .strict();
export type SandboxCommand = z.infer<typeof sandboxCommand>;
export type Journal = z.infer<typeof journalSchema>;
export type SandboxState = {
  journal: Journal;
  workspace: Workspace;
  subscription: SubscriptionView;
};
export const sandboxStorageKey = "scout-isolated-synthetic-v1";
