import type { Metadata } from "next";
import { requireWalletIdentity } from "@/lib/auth-server";
import { CustomerPaymentWorkspace } from "@/components/customer-payment-workspace";
import { SmartAccountPayment } from "@/components/smart-account-payment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Send money — StealthBridge", robots: { index: false, follow: false } };

export default async function AppSend() {
  const identity = await requireWalletIdentity();
  return (
    <>
      <div className="sb-page">
        <header className="sb-page-header">
          <div>
            <span className="sb-eyebrow">Personal · Send</span>
            <h1>Send money</h1>
            <p>Pay any Stellar address from your smart account. You approve every payment with your passkey; StealthBridge covers the network fee.</p>
          </div>
        </header>
        <SmartAccountPayment address={identity.address} />
      </div>
      <div style={{ marginTop: 64 }}>
        <CustomerPaymentWorkspace flow="send" identityAddress={identity.address} embedded />
      </div>
    </>
  );
}
