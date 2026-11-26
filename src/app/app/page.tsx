import type { Metadata } from "next";
import { requireWalletIdentity } from "@/lib/auth-server";
import { Dashboard } from "@/components/app/dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home — StealthBridge" };

export default async function Home() {
  const identity = await requireWalletIdentity();
  return <Dashboard address={identity.address} profilesEnabled={process.env.STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED === "true"} />;
}
