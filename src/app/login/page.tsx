import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, Fingerprint, Receipt } from "lucide-react";
import { WalletSignIn } from "@/components/wallet-sign-in";
import { currentWalletIdentity } from "@/lib/auth-server";
import { validAccountDestination } from "@/lib/account-destination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in — StealthBridge", description: "Sign in to your Stellar Testnet StealthBridge workspace with any Stellar wallet.", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const destination = validAccountDestination(params.next) ? params.next : "/app";
  const identity = await currentWalletIdentity();
  if (identity) redirect(destination);
  return (
    <div className="sb-light sb-auth">
      <header className="sb-auth-header">
        <Link href="/" className="sb-sidebar-brand" aria-label="StealthBridge home">
          <Image src="/brand/stealthbridge-symbol.svg" alt="" width={30} height={30} priority />
          StealthBridge
        </Link>
        <Link href="/" className="sb-btn sb-btn-ghost sb-btn-sm"><ArrowLeft size={15} aria-hidden /> Back to StealthBridge</Link>
      </header>
      <main id="main-content" className="sb-auth-main">
        <div className="sb-auth-copy">
          <span className="sb-eyebrow">Your account</span>
          <h1>Your world of payments, one secure space.</h1>
          <p>Sign in once with the Stellar wallet you already use. Then create a passkey smart account, send money on Testnet and follow every payment on the ledger.</p>
          <ul className="sb-checklist" style={{ marginTop: 28 }}>
            <li data-state="done"><Fingerprint size={17} aria-hidden /><span><strong>Passkey smart accounts</strong>Approve each payment with Face ID, fingerprint or PIN.</span></li>
            <li data-state="done"><Receipt size={17} aria-hidden /><span><strong>Ledger-verified activity</strong>Payments count as completed only when Stellar confirms them.</span></li>
            <li data-state="done"><BadgeCheck size={17} aria-hidden /><span><strong>Network fees covered</strong>StealthBridge sponsors fees and never holds your keys.</span></li>
          </ul>
        </div>
        <WalletSignIn destination={destination} />
      </main>
    </div>
  );
}
