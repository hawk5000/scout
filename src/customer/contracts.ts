import { z } from "zod";
import { categories, profileSchema } from "../lib/contracts";
import { customerFinding, marketRun, marketMode } from "./market-contracts";
export const loginInput = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(200) })
  .strict();
export const coverageSchema = z
  .object({
    corporate: z.string().max(2000),
    project: z.string().max(2000),
    event: z.string().max(2000),
  })
  .strict();
// Draft storage is separate from the complete research-brief contract.
export const postalAddressSchema = z
  .object({
    line1: z.string().trim().max(150),
    line2: z.string().trim().max(150),
    city: z.string().trim().max(100),
    region: z.string().trim().max(100),
    postalCode: z.string().trim().max(30),
    country: z.string().trim().max(100),
  })
  .strict();
export const customerDraftProfile = profileSchema.extend({
  website: profileSchema.shape.website.or(z.literal("")).default(""),
  address: z.string().trim().max(1000).default(""),
  postalAddress: postalAddressSchema.optional(),
  timezone: profileSchema.shape.timezone.or(z.literal("")).default(""),
  marketCenter: profileSchema.shape.marketCenter.or(z.literal("")).default(""),
  radiusMiles: profileSchema.shape.radiusMiles.nullable().default(null),
  includedPlaces: profileSchema.shape.includedPlaces.element
    .array()
    .max(30)
    .default([]),
  excludedPlaces: profileSchema.shape.excludedPlaces.default([]),
  categories: z
    .array(z.enum(categories))
    .max(3)
    .refine((v) => new Set(v).size === v.length)
    .default([]),
  priorities: profileSchema.shape.priorities.default([]),
  exclusions: profileSchema.shape.exclusions.default([]),
  recipients: profileSchema.shape.recipients.default([]),
  scheduleDays: profileSchema.shape.scheduleDays.or(z.tuple([])).default([]),
  scheduleTime: profileSchema.shape.scheduleTime.or(z.literal("")).default(""),
  confirmed: z.boolean().default(false),
});
export type CustomerDraftProfile = z.infer<typeof customerDraftProfile>;
export const customerMutation = z
  .object({
    revision: z.number().int().nonnegative(),
    profile: customerDraftProfile,
    coverage: coverageSchema,
  })
  .strict();
export type CustomerMutation = z.infer<typeof customerMutation>;
export const customerWorkspace = z
  .object({
    mode: z.literal("customer"),
    manualResearchAllowed: z.boolean().optional(),
    propertyName: z.string(),
    role: z.enum(["viewer", "editor", "admin"]),
    revision: z.number().int().nonnegative(),
    profile: customerDraftProfile.nullable(),
    coverage: coverageSchema,
    findings: z.array(customerFinding),
    runs: z.array(marketRun).default([]),
    marketRevision: z.number().int().nonnegative().default(0),
    marketMode: marketMode.nullable().default(null),
    researchEnabled: z.literal(false),
    paidCallsEnabled: z.literal(false),
    notificationsEnabled: z.literal(false),
  })
  .strict();
export type CustomerWorkspace = z.infer<typeof customerWorkspace>;
export const emptyCoverage = Object.fromEntries(
  categories.map((c) => [c, ""]),
) as z.infer<typeof coverageSchema>;
export class CustomerError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
export const customerHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
export async function readJson(
  request: Request,
  limit = 24000,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new CustomerError("Invalid request.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new CustomerError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new CustomerError("Invalid request.", 400);
  }
}
export function httpsOrigin(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new CustomerError("Customer access is not configured.");
  return url.origin;
}
