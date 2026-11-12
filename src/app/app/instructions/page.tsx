import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {PaymentInstructions} from "@/components/payment-instructions";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Payment instructions — StealthBridge"};
export default async function InstructionsPage(){
 const identity=await requireWalletIdentity();
 return <><div className="account-heading"><h1>Payment instructions</h1><p>Manage the details you have prepared, with a clear record of what is saved, expired or cancelled.</p></div><PaymentInstructions key={identity.address} address={identity.address}/></>;
}
