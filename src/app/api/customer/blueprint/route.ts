import { blueprintActions } from "@/research/blueprint-workflow";
import {
  broker,
  customerFailure,
  rejectQuery,
  requireOrigin,
  sessionToken,
} from "@/customer/broker";
import { customerHeaders, readJson } from "@/customer/contracts";

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    rejectQuery(request);
    return Response.json(
      await broker({
        operation: "blueprint-workflow",
        token: await sessionToken(),
        input: { action: "status" },
      }),
      { headers: customerHeaders },
    );
  } catch (error) {
    return customerFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    rejectQuery(request);
    const input = blueprintActions.parse(await readJson(request, 8192));
    return Response.json(
      await broker({
        operation: "blueprint-workflow",
        token: await sessionToken(),
        input,
      }),
      { headers: customerHeaders },
    );
  } catch (error) {
    return customerFailure(error);
  }
}
