import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { AccessError } from "./repository";
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
export function responseError(error: unknown) {
  if (error instanceof AccessError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: privateHeaders },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400, headers: privateHeaders },
    );
  return NextResponse.json(
    { error: "The request could not be completed. Please retry." },
    { status: 500, headers: privateHeaders },
  );
}
export async function boundedJson(request: Request) {
  const text = await request.text();
  if (text.length > 20000) throw new AccessError("Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AccessError("Invalid JSON.", 400);
  }
}
