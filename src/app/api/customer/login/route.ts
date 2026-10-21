import { cookies } from "next/headers";
import { z } from "zod";
import {
  broker,
  cookieName,
  customerFailure,
  rejectQuery,
  requireOrigin,
  sessionToken,
} from "@/customer/broker";
import { customerHeaders, loginInput, readJson } from "@/customer/contracts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    rejectQuery(request);
    const input = loginInput.parse(await readJson(request, 2000));
    const result = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        expiresAt: z.number().int().positive(),
      })
      .strict()
      .parse(
        await broker({
          operation: "login",
          input,
          networkKey: "scout-customer-app",
        }),
      );
    const old = await sessionToken();
    if (old) await broker({ operation: "logout", token: old });
    (await cookies()).set(cookieName, result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      expires: new Date(result.expiresAt),
    });
    return Response.json({ ok: true }, { headers: customerHeaders });
  } catch (e) {
    return customerFailure(e);
  }
}
