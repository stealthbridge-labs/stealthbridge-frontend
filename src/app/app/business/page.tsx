import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Business payments — StealthBridge"};
export default async function AppBusiness(){
 const identity=await requireWalletIdentity();
 return <CustomerPaymentWorkspace flow="business" identityAddress={identity.address}/>;
}
