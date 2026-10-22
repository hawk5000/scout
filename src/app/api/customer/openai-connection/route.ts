import {
  broker,
  customerFailure,
  rejectQuery,
  sessionToken,
} from "@/customer/broker";
import { customerHeaders } from "@/customer/contracts";

export async function GET(request: Request) {
  try {
    rejectQuery(request);
    const result = await broker({
      operation: "openai-connection",
      token: await sessionToken(),
    });
    return Response.json(result, { headers: customerHeaders });
  } catch (error) {
    return customerFailure(error);
  }
}
