import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Prepare a business payment — StealthBridge",
 robots:{index:false,follow:false}};
export default async function BusinessPaymentPage(){
 const identity=await requireWalletIdentity();
 return <div className="sb-page sb-legacy">
  <CustomerPaymentWorkspace flow="business" identityAddress={identity.address}/>
 </div>;
}
