import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { repository } from "@/server/runtime";
import { assertSameOrigin, rejectScopeOverride } from "@/server/access";
import { boundedJson, privateHeaders, responseError } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    rejectScopeOverride(new URL(request.url).searchParams, []);
    return NextResponse.json(
      repository().subscription(
        (await cookies()).get("scout_demo")?.value ?? "",
      ),
      { headers: privateHeaders },
    );
  } catch (error) {
    return responseError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rejectScopeOverride(new URL(request.url).searchParams, []);
    return NextResponse.json(
      repository().subscription(
        (await cookies()).get("scout_demo")?.value ?? "",
        await boundedJson(request),
      ),
      { headers: privateHeaders },
    );
  } catch (error) {
    return responseError(error);
  }
}
