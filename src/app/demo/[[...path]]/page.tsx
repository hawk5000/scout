import Link from "next/link";
import { Brand } from "@/components/ui";
import { demoEnabled } from "@/server/access";
import { WorkspaceApp } from "@/components/workspace";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Fictional demo",
  robots: { index: false, follow: false },
};
export default function DemoPage() {
  if (!demoEnabled())
    return (
      <main id="main" className="access-page">
        <Brand />
        <h1>The interactive workspace is not available yet.</h1>
        <p>
          You can explore the fictional market sample and download its CSV.
          Customer access and live research have not been activated.
        </p>
        <Link className="button primary" href="/sample">
          View the fictional sample
        </Link>
        <p>
          <Link className="text-link" href="/">
            Back to the service
          </Link>
        </p>
      </main>
    );
  return <WorkspaceApp />;
}
