import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Your transfers — StealthBridge"};
export default async function AppSend(){
 const identity=await requireWalletIdentity();
 return <CustomerPaymentWorkspace flow="send" identityAddress={identity.address}/>;
}
