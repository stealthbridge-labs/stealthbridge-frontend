import type {Metadata} from "next";
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
  <BusinessOnboarding address={identity.address}/>
  <details className="business-technical-workspace">
   <summary>Explore Testnet payment preparation (not yet enabled)</summary>
   <div><CustomerPaymentWorkspace flow="business" identityAddress={identity.address}/></div>
  </details>
 </>;
}
