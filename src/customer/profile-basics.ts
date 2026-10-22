import {
  customerDraftProfile,
  postalAddressSchema,
  type CustomerDraftProfile,
} from "./contracts";
// The customer edits hotel facts only. Preserve operator-managed settings and legacy addresses.
export function profileFromBasics(
  current: CustomerDraftProfile | null,
  form: FormData,
) {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const postalAddress = postalAddressSchema.parse(
    Object.fromEntries(
      ["line1", "line2", "city", "region", "postalCode", "country"].map(
        (key) => [key, value(key)],
      ),
    ),
  );
  const hasAddress = Object.values(postalAddress).some(Boolean);
  const baseline =
    current ?? customerDraftProfile.parse({ name: value("name") });
  return customerDraftProfile.parse({
    ...baseline,
    name: value("name"),
    website: value("website"),
    ...(form.has("marketCenter")
      ? { marketCenter: value("marketCenter") }
      : {}),
    ...(form.has("radiusMiles")
      ? {
          radiusMiles: value("radiusMiles")
            ? Number(value("radiusMiles"))
            : null,
        }
      : {}),
    ...(form.has("includedPlaces")
      ? {
          includedPlaces: value("includedPlaces")
            .split("\n")
            .map((place) => place.trim())
            .filter(Boolean),
        }
      : {}),
    ...(form.has("excludedPlaces")
      ? {
          excludedPlaces: value("excludedPlaces")
            .split("\n")
            .map((place) => place.trim())
            .filter(Boolean),
        }
      : {}),
    ...(hasAddress || current?.postalAddress
      ? {
          postalAddress,
          address: [
            postalAddress.line1,
            postalAddress.line2,
            [postalAddress.city, postalAddress.region, postalAddress.postalCode]
              .filter(Boolean)
              .join(", "),
            postalAddress.country,
          ]
            .filter(Boolean)
            .join("\n"),
        }
      : {}),
  });
}
