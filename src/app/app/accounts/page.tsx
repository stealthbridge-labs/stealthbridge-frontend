import type { Metadata } from "next";
import { requireWalletIdentity } from "@/lib/auth-server";
import { SmartAccountsWorkspace } from "@/components/smart-accounts-workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Smart accounts — StealthBridge", robots: { index: false, follow: false } };

export default async function SmartAccountsPage() {
  const identity = await requireWalletIdentity();
  return <SmartAccountsWorkspace key={identity.address} address={identity.address} />;
}
