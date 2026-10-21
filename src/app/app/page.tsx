import Link from "next/link";
import { Brand } from "@/components/ui";
export default function ProductionGate() {
  return (
    <main id="main" className="access-page">
      <Brand />
      <h1>Customer access is not activated.</h1>
      <p>
        SCOUT requires verified hotel access and service activation before
        production records are available.
      </p>
      <Link className="button primary" href="/demo">
        Explore the fictional demo
      </Link>
    </main>
  );
}
