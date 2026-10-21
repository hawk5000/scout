import {
  broker,
  customerFailure,
  getWorkspace,
  rejectQuery,
  requireOrigin,
  sessionToken,
} from "@/customer/broker";
import {
  customerHeaders,
  customerWorkspace,
  readJson,
} from "@/customer/contracts";
import { findingStateMutation } from "@/customer/market-contracts";
import { selectCustomerFindings, customerCsv } from "@/customer/market-export";
export async function GET(request: Request) {
  try {
    const workspace = await getWorkspace();
    const findings = selectCustomerFindings(
      workspace.findings,
      new URL(request.url).searchParams,
    );
    return new Response(customerCsv(findings), {
      headers: {
        ...customerHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="scout-findings.csv"',
      },
    });
  } catch (error) {
    return customerFailure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    requireOrigin(request);
    rejectQuery(request);
    const input = findingStateMutation.parse(await readJson(request));
    const result = customerWorkspace.parse(
      await broker({
        operation: "finding-state",
        token: await sessionToken(),
        input,
      }),
    );
    return Response.json(result, { headers: customerHeaders });
  } catch (error) {
    return customerFailure(error);
  }
}
