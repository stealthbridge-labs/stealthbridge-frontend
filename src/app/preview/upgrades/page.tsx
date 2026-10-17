import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {UpgradeReviewWorkspace} from "@/components/upgrade-review-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Protocol upgrade review | StealthBridge",
 description:"Read-only Testnet Soroban registry upgrade proposal review.",
 robots:{index:false,follow:false},
};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <UpgradeReviewWorkspace/>;
}
