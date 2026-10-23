import { openAiPilotActions } from "@/research/openai-pilot";
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
        operation: "openai-pilot",
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
    const input = openAiPilotActions.parse(await readJson(request, 2048));
    return Response.json(
      await broker({
        operation: "openai-pilot",
        token: await sessionToken(),
        input,
      }),
      { headers: customerHeaders },
    );
  } catch (error) {
    return customerFailure(error);
  }
}
