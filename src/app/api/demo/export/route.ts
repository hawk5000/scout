import { cookies } from "next/headers";
import { repository } from "@/server/runtime";
import { rejectScopeOverride } from "@/server/access";
import { privateHeaders, responseError } from "@/server/http";
import { filtersSchema, filterFindings } from "@/lib/contracts";
import { toCsv } from "@/lib/export";
import { AccessError } from "@/server/repository";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    rejectScopeOverride(params, ["q", "category", "state", "quality", "ids"]);
    const filters = filtersSchema.parse(
      Object.fromEntries([...params.entries()].filter(([k]) => k !== "ids")),
    );
    const workspace = repository().read(
      (await cookies()).get("scout_demo")?.value ?? "",
    );
    let list = filterFindings(workspace.findings, filters);
    if (params.has("ids")) {
      const ids = params.get("ids")!.split(",");
      if (
        ids.length > 100 ||
        ids.some((id) => !workspace.findings.some((f) => f.id === id))
      )
        throw new AccessError(
          "Selection contains an unavailable finding.",
          404,
        );
      list = list.filter((f) => ids.includes(f.id));
    }
    return new Response(toCsv(list), {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="SCOUT-fictional-demo.csv"',
      },
    });
  } catch (error) {
    return responseError(error);
  }
}
