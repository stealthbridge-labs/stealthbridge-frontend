import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {ObservabilityWorkspace} from "@/components/observability-workspace";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Testnet Observability · StealthBridge",
 description:"Read-only live Stellar Testnet and backend dependency observations.",
 robots:{index:false,follow:false},
};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <ObservabilityWorkspace/>;
}
