import { customerFailure, getWorkspace, rejectQuery } from "@/customer/broker";
import { customerHeaders } from "@/customer/contracts";
export async function GET(request: Request) {
  try {
    rejectQuery(request);
    const workspace = await getWorkspace();
    return Response.json(
      { exportedAt: new Date().toISOString(), ...workspace },
      {
        headers: {
          ...customerHeaders,
          "Content-Disposition":
            'attachment; filename="scout-hotel-profile.json"',
        },
      },
    );
  } catch (e) {
    return customerFailure(e);
  }
}
