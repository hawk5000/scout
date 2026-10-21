import { cookies } from "next/headers";
import {
  broker,
  cookieName,
  customerFailure,
  rejectQuery,
  requireOrigin,
  sessionToken,
} from "@/customer/broker";
import { customerHeaders } from "@/customer/contracts";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    rejectQuery(request);
    const token = await sessionToken();
    if (token) await broker({ operation: "logout", token });
    (await cookies()).set(cookieName, "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return Response.json({ ok: true }, { headers: customerHeaders });
  } catch (e) {
    return customerFailure(e);
  }
}
