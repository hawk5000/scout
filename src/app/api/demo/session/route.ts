import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertDemoEnabled, assertSameOrigin } from "@/server/access";
import { repository } from "@/server/runtime";
import { privateHeaders, responseError } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertDemoEnabled();
    assertSameOrigin(request);
    const jar = await cookies();
    const current = jar.get("scout_demo")?.value;
    if (current) {
      try {
        repository().read(current);
        return NextResponse.json({ ok: true }, { headers: privateHeaders });
      } catch {}
    }
    const token = repository().createSession();
    jar.set("scout_demo", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 604800,
    });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return responseError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    assertDemoEnabled();
    assertSameOrigin(request);
    const jar = await cookies();
    const token = jar.get("scout_demo")?.value;
    if (token) repository().revoke(token);
    jar.delete("scout_demo");
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return responseError(error);
  }
}
