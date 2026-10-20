import type {Metadata} from "next";
import {CustomerPaymentWorkspace} from "@/components/customer-payment-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"StealthBridge Business — Cross-border payments",
 description:"Organize business settlement instructions, real corridor availability and Stellar wallet access. Payment submission remains disabled.",
 alternates:{canonical:"/business"},
 openGraph:{title:"StealthBridge Business — Cross-border payments",description:"Your business payment workspace.",url:"/business",type:"website"}
};
export default function Page(){return <CustomerPaymentWorkspace flow="business"/>;}
