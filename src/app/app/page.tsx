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
async function CustomerPage() {
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

export default async function AccountRoute() {
  const acceptance = process.env.SCOUT_HOSTED_ACCEPTANCE === "true";
  if (acceptance && process.env.VERCEL_ENV === "production")
    return (
      <main>
        <h1>Acceptance is unavailable on production.</h1>
      </main>
    );
  return (
    <>
      {acceptance && (
        <aside className="notice" role="note">
          Isolated hosted acceptance · fictional accounts and findings only.
          Authentication is simulated; this is not SIL sign-in. Do not enter a
          real customer password. Live research, paid calls and notifications
          are disabled.
        </aside>
      )}
      {await CustomerPage()}
    </>
  );
}
