import type {Metadata} from "next";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"StealthBridge Send — International transfers",
 description:"Connect your Stellar wallet, explore actual cross-border routes and prepare your transfer. Payments are not enabled.",
 alternates:{canonical:"/send"},
 openGraph:{title:"StealthBridge Send — International transfers",description:"Your international transfer workspace.",url:"/send",type:"website"}
};
export default function Page(){return <CustomerPaymentWorkspace flow="send"/>;}
