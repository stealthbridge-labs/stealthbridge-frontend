import type { Metadata } from "next";
import { requireWalletIdentity } from "@/lib/auth-server";
import { CustomerPaymentWorkspace } from "@/components/customer-payment-workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cross-border routes — StealthBridge", robots: { index: false, follow: false } };

export default async function RoutesPage() {
  const identity = await requireWalletIdentity();
  return (
    <div className="sb-page sb-legacy">
      <header className="sb-page-header">
        <div>
          <span className="sb-eyebrow">Planning</span>
          <h1>Cross-border routes</h1>
          <p>Explore published payment corridors, save encrypted drafts and track settlement progress. Fiat payouts aren&apos;t available yet.</p>
        </div>
      </header>
      <CustomerPaymentWorkspace flow="send" identityAddress={identity.address} embedded />
    </div>
  );
}
