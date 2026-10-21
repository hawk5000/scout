import Link from "next/link";
import { Brand } from "@/components/ui";
import { CustomerAccount, CustomerLogin } from "@/components/customer-account";
import { customerConfigured, getWorkspace } from "@/customer/broker";
import { CustomerError } from "@/customer/contracts";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Customer account",
  robots: { index: false, follow: false },
};
export default async function CustomerPage() {
  if (!customerConfigured())
    return (
      <main id="main" className="access-page">
        <Brand />
        <h1>Customer access is not activated.</h1>
        <p>
          SCOUT requires verified hotel access and service activation before
          production records are available.
        </p>
        <Link className="button primary" href="/sample">
          View the fictional sample
        </Link>
      </main>
    );
  try {
    return <CustomerAccount initial={await getWorkspace()} />;
  } catch (e) {
    if (e instanceof CustomerError && e.status === 401)
      return <CustomerLogin />;
    return (
      <main id="main" className="access-page">
        <Brand />
        <h1>Customer access is temporarily unavailable.</h1>
        <p>Your saved data has not been changed. Please try again later.</p>
        <Link href="/app">Try again</Link>
      </main>
    );
  }
}
