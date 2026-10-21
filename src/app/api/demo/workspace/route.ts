import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { repository } from "@/server/runtime";
import { assertSameOrigin, rejectScopeOverride } from "@/server/access";
import { boundedJson, privateHeaders, responseError } from "@/server/http";
import { mutationSchema } from "@/lib/contracts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    rejectScopeOverride(new URL(request.url).searchParams, []);
    return NextResponse.json(
      repository().read((await cookies()).get("scout_demo")?.value ?? ""),
      { headers: privateHeaders },
    );
  } catch (error) {
    return responseError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    rejectScopeOverride(new URL(request.url).searchParams, []);
    const input = mutationSchema.parse(await boundedJson(request));
    return NextResponse.json(
      repository().mutate(
        (await cookies()).get("scout_demo")?.value ?? "",
        input,
      ),
      { headers: privateHeaders },
    );
  } catch (error) {
    return responseError(error);
  }
}
