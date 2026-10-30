import type {Metadata} from "next";
import Link from "next/link";
import {ArrowUpRight,FileSpreadsheet} from "lucide-react";
import {requireWalletIdentity} from "@/lib/auth-server";
import {BusinessOnboarding} from "@/components/business-onboarding";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Business workspace — StealthBridge"};
export default async function AppBusiness(){
 const identity=await requireWalletIdentity();
 return <>
  <Link className="batch-business-entry" href="/app/business/batch"><FileSpreadsheet size={21} aria-hidden/>
   <span><strong>Plan a batch of international payments</strong>
    <small>Review up to 50 browser-only instructions against real configured Testnet corridors. Nothing is submitted.</small></span>
   <ArrowUpRight size={21} aria-hidden/>
  </Link>
  <CustomerPaymentWorkspace flow="business" identityAddress={identity.address}/>
  <section className="business-onboarding-section" aria-label="Manage your business">
   <BusinessOnboarding address={identity.address}/>
  </section>
 </>;
}
