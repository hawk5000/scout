import { renderReviewReport } from "../src/customer/review-report";
import { readFile, writeFile } from "node:fs/promises";
import { httpsOrigin } from "../src/customer/contracts";
async function main() {
  // Credential is environment-only. No default destination, automatic enrollment or approval.
  const [operation, ...args] = process.argv.slice(2);
  if (operation === "--help") {
    console.log(
      "enroll <confirmed-property-id> | stage <batch.json> | list [before-id] | read <review-id> <report.html> | approve|reject <review-id> <approval-hash> <review-note>",
    );
    return;
  }
  const origin = httpsOrigin(process.env.SCOUT_REVIEW_ORIGIN ?? "");
  const token = process.env.SCOUT_REVIEW_TOKEN;
  if (!token || token.length < 32)
    throw Error("Set SCOUT_REVIEW_TOKEN securely in the operator environment.");
  let command: unknown;
  if (operation === "enroll" && args.length === 1)
    command = { operation, confirmPropertyId: args[0] };
  else if (operation === "stage" && args.length === 1)
    command = { operation, batch: JSON.parse(await readFile(args[0], "utf8")) };
  else if (operation === "list" && args.length <= 1)
    command = { operation, before: args[0] };
  else if (operation === "read" && args.length === 2)
    command = { operation, reviewId: args[0] };
  else if (
    (operation === "approve" || operation === "reject") &&
    args.length === 3
  )
    command = {
      operation: "decide",
      reviewId: args[0],
      approvalHash: args[1],
      decision: operation === "approve" ? "approved" : "rejected",
      note: args[2],
      evidenceReviewed: true,
      lodgingInferenceReviewed: true,
    };
  else
    throw Error(
      "Usage: enroll <confirmed-property-id> | stage <batch.json> | list [before-id] | read <review-id> <report.html> | approve|reject <review-id> <approval-hash> <review-note>. Approval attests you reviewed sources, facts, dates, lodging inference and unknowns in the report.",
    );
  const response = await fetch(origin + "/reviews", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(
      `Review request failed (${response.status}): ${data.error ?? "Unavailable"}`,
    );
  if (operation === "read") {
    await writeFile(args[1], renderReviewReport(data), "utf8");
    console.log(
      JSON.stringify({
        report: args[1],
        reviewId: data.reviewId,
        status: data.status,
        stale: data.stale,
        approvalHash: data.approvalHash,
      }),
    );
  } else if (operation === "stage")
    console.log(
      JSON.stringify({
        reviewId: data.reviewId,
        status: data.status,
        expectedRevision: data.expectedRevision,
        approvalHash: data.approvalHash,
        next: "Read the saved review report before deciding.",
      }),
    );
  else console.log(JSON.stringify(data));
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Review command failed.",
  );
  process.exitCode = 1;
});
