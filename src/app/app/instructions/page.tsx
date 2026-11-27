import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {PaymentInstructions} from "@/components/payment-instructions";
import {PageHeader} from "@/components/app/page-header";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Payment instructions — StealthBridge"};
export default async function InstructionsPage(){
 const identity=await requireWalletIdentity();
 return <div className="sb-page">
  <PageHeader eyebrow="Planning" title="Payment instructions" description="Details you've prepared, encrypted before they're stored, with a clear record of what is saved, expired or cancelled."/>
  <PaymentInstructions key={identity.address} address={identity.address}/>
 </div>;
}
