import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft,LockKeyhole} from "lucide-react";
import {requireWalletIdentity} from "@/lib/auth-server";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Prepare a business payment — StealthBridge",
 robots:{index:false,follow:false}};
export default async function BusinessPaymentPage(){
 const identity=await requireWalletIdentity();
 return <div className="sb-page">
  <div className="sb-card-row" style={{alignItems:"center"}}>
   <Link className="sb-link" href="/app/business"><ArrowLeft size={16} aria-hidden/> Back to business workspace</Link>
   <span className="sb-badge" data-tone="info"><LockKeyhole size={12} aria-hidden/> Planning only: nothing is submitted</span>
  </div>
  <CustomerPaymentWorkspace flow="business" identityAddress={identity.address}/>
 </div>;
}
