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
  customerMutation,
  customerWorkspace,
  readJson,
} from "@/customer/contracts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    rejectQuery(request);
    return Response.json(await getWorkspace(), { headers: customerHeaders });
  } catch (e) {
    return customerFailure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    requireOrigin(request);
    rejectQuery(request);
    const input = customerMutation.parse(await readJson(request));
    return Response.json(
      customerWorkspace.parse(
        await broker({
          operation: "update",
          token: await sessionToken(),
          input,
        }),
      ),
      { headers: customerHeaders },
    );
  } catch (e) {
    return customerFailure(e);
  }
}
