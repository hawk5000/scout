import { z } from "zod";
// Offline operator preparation only. This never creates a SIL identity or grants SIL entitlement.
const id = z.string().trim().min(1).max(160);
export const accessPreparation = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("assign"),
      tenantId: id,
      propertyId: id,
      userId: id,
      propertyName: z.string().trim().min(1).max(300),
      role: z.enum(["viewer", "editor", "admin"]),
    })
    .strict(),
  z
    .object({
      operation: z.literal("revoke"),
      tenantId: id,
      propertyId: id,
      userId: id,
    })
    .strict(),
  z
    .object({
      operation: z.literal("delete-property"),
      tenantId: id,
      propertyId: id,
      confirmation: z.literal("DELETE PRIVATE SCOUT DATA"),
    })
    .strict(),
]);
export function prepareAccess(value: unknown) {
  const input = accessPreparation.parse(value),
    quote = (s: string) => "'" + s.replaceAll("'", "''") + "'",
    scope = `tenant_id=${quote(input.tenantId)} AND property_id=${quote(input.propertyId)}`;
  const preamble =
    "-- Review against verified SIL identities and an approved SCOUT database. Apply only with separate authorization.\n";
  if (input.operation === "revoke")
    return (
      preamble +
      `UPDATE customer_memberships SET active=0 WHERE ${scope} AND user_id=${quote(input.userId)};\n`
    );
  if (input.operation === "delete-property")
    return (
      preamble +
      `DELETE FROM customer_properties WHERE ${scope};\n-- Audit metadata is retained under the operator's retention policy; no profile content is logged.\n`
    );
  return (
    preamble +
    `INSERT INTO customer_properties(tenant_id,property_id,property_name) VALUES(${quote(input.tenantId)},${quote(input.propertyId)},${quote(input.propertyName)}) ON CONFLICT(tenant_id,property_id) DO NOTHING;\nINSERT INTO customer_memberships(tenant_id,property_id,user_id,role) VALUES(${quote(input.tenantId)},${quote(input.propertyId)},${quote(input.userId)},${quote(input.role)});\n-- Existing membership conflicts deliberately fail; review role changes explicitly.\n`
  );
}
