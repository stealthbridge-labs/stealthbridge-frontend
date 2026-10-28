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
  <div className="account-heading">
   <span className="section-index">STEALTHBRIDGE / BUSINESS</span>
   <h1>Where your business goes further.</h1>
   <p>Build the foundation for international settlement, collaborate on the right controls, and explore supported corridors as they're verified.</p>
  </div>
  <Link className="batch-business-entry" href="/app/business/batch"><FileSpreadsheet size={21} aria-hidden/>
   <span><strong>Plan a batch of international payments</strong>
    <small>Review up to 50 browser-only instructions against real configured Testnet corridors. Nothing is submitted.</small></span>
   <ArrowUpRight size={21} aria-hidden/>
  </Link>
  <BusinessOnboarding address={identity.address}/>
  <details className="business-technical-workspace">
   <summary>Explore Testnet payment preparation (not yet enabled)</summary>
   <div><CustomerPaymentWorkspace flow="business" identityAddress={identity.address}/></div>
  </details>
 </>;
}
