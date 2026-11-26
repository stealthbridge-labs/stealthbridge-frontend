import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWalletIdentity } from "@/lib/auth-server";
import { SmartAccountPayment } from "@/components/smart-account-payment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Send money — StealthBridge", robots: { index: false, follow: false } };

export default async function AppSend({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await requireWalletIdentity();
  // Corridor deep links (public route explorer, older bookmarks) belong to the route planner.
  const { corridor } = await searchParams;
  if (typeof corridor === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(corridor)) {
    redirect(`/app/routes?corridor=${corridor.toLowerCase()}`);
  }
  return (
    <div className="sb-page">
      <header className="sb-page-header">
        <div>
          <span className="sb-eyebrow">Money</span>
          <h1>Send money</h1>
          <p>Pay any Stellar address from your smart account. You approve every payment with your passkey; StealthBridge covers the network fee.</p>
        </div>
      </header>
      <SmartAccountPayment address={identity.address} />
    </div>
  );
}
