import { z } from "zod";
const minutes = z.number().finite().min(0).max(10000).nullable();
// Assumption calculator only; unknown inputs never become zero or claimed profit.
export function commercialSensitivity(input: unknown) {
  const value = z
    .object({
      monthlyResearchUsd: z.number().min(0).max(100000).nullable(),
      monthlyHostingUsd: z.number().min(0).max(100000).nullable(),
      supportMinutes: minutes,
      hourlyLaborUsd: z.number().min(0).max(10000).nullable(),
      onboardingMinutes: minutes,
      baselineResearchUsd: z.number().min(0).max(100000).nullable(),
    })
    .strict()
    .parse(input);
  const recurring =
    value.monthlyResearchUsd !== null &&
    value.monthlyHostingUsd !== null &&
    value.supportMinutes !== null &&
    value.hourlyLaborUsd !== null
      ? 50 -
        value.monthlyResearchUsd -
        value.monthlyHostingUsd -
        (value.supportMinutes / 60) * value.hourlyLaborUsd
      : null;
  const setup =
    value.onboardingMinutes !== null &&
    value.hourlyLaborUsd !== null &&
    value.baselineResearchUsd !== null
      ? 99 -
        value.baselineResearchUsd -
        (value.onboardingMinutes / 60) * value.hourlyLaborUsd
      : null;
  return {
    label:
      "Assumption sensitivity only; excludes acquisition, payment, tax and other overhead. Not measured profit.",
    monthlyContributionUsd: recurring,
    setupContributionUsd: setup,
  };
}
