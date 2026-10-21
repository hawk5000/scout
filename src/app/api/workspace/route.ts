import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Production access is not configured. Verified authentication, property membership and entitlement are required.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
