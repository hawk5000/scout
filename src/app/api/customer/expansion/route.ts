import { z } from "zod";
import {
  broker,
  customerFailure,
  rejectQuery,
  requireOrigin,
  sessionToken,
} from "@/customer/broker";
import { CustomerError, customerHeaders, readJson } from "@/customer/contracts";
import { expansionCommand } from "@/customer/expansion-contracts";
import type { ExpansionState } from "@/customer/expansion";
import {
  briefingCsv,
  briefingHtml,
  briefingText,
} from "@/customer/brief-export";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((k) => params.getAll(k).length > 1))
      throw new CustomerError("Duplicate parameter.", 400);
    const query = z
      .object({
        briefId: z.string().uuid().optional(),
        format: z.enum(["csv", "text", "html"]).optional(),
      })
      .strict()
      .parse(Object.fromEntries(params));
    const state = (await broker({
      operation: "expansion",
      token: await sessionToken(),
      input: {
        action: "read",
        ...(query.briefId ? { briefId: query.briefId } : {}),
      },
    })) as ExpansionState;
    if (query.format) {
      if (!state.brief)
        throw new CustomerError("No briefing is available yet.", 404);
      return new Response(
        query.format === "csv"
          ? briefingCsv(state.brief)
          : query.format === "html"
            ? briefingHtml(state.brief)
            : briefingText(state.brief),
        {
          headers: {
            ...customerHeaders,
            "Content-Type":
              query.format === "csv"
                ? "text/csv; charset=utf-8"
                : query.format === "html"
                  ? "text/html; charset=utf-8"
                  : "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="scout-briefing-${state.brief.version}.${query.format === "csv" ? "csv" : query.format === "html" ? "html" : "txt"}"`,
          },
        },
      );
    }
    return Response.json(state, { headers: customerHeaders });
  } catch (e) {
    return customerFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    rejectQuery(request);
    const input = expansionCommand.parse(await readJson(request));
    return Response.json(
      await broker({
        operation: "expansion",
        token: await sessionToken(),
        input,
      }),
      { headers: customerHeaders },
    );
  } catch (e) {
    return customerFailure(e);
  }
}
