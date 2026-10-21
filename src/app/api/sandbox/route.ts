import { NextResponse } from "next/server";
import { assertSameOrigin, rejectScopeOverride } from "@/server/access";
import { privateHeaders, responseError } from "@/server/http";
import { AccessError } from "@/server/repository";
import { evaluateSandbox } from "@/server/sandbox";
export const runtime = "nodejs";
export const maxDuration = 15;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rejectScopeOverride(new URL(request.url).searchParams, []);
    const reader = request.body?.getReader();
    if (!reader) throw new AccessError("Missing request.", 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 262144) {
        await reader.cancel();
        throw new AccessError(
          "Demo history exceeds 256 KB. Export and clear the demo.",
          413,
        );
      }
      chunks.push(value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AccessError("Invalid JSON.", 400);
    }
    return NextResponse.json(evaluateSandbox(input), {
      headers: privateHeaders,
    });
  } catch (error) {
    return responseError(error);
  }
}
