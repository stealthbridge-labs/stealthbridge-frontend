import type { Metadata } from "next";
import { Suspense } from "react";
import { requireWalletIdentity } from "@/lib/auth-server";
import { Activity } from "@/components/app/activity";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity — StealthBridge", robots: { index: false, follow: false } };

export default async function ActivityPage() {
  const identity = await requireWalletIdentity();
  return <Suspense fallback={null}><Activity address={identity.address} /></Suspense>;
}
