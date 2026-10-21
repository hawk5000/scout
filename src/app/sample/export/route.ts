import { publicSample } from "@/lib/public-sample";
import { toCsv } from "@/lib/export";
export function GET() {
  return new Response(toCsv(publicSample), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="scout-fictional-sample.csv"',
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
