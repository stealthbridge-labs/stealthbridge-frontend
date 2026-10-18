import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {PlatformModulesWorkspace} from "@/components/platform-modules-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"StealthBridge platform modules",
 description:"Read-only StealthBridge Testnet product capability inventory.",
 robots:{index:false,follow:false},
};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <PlatformModulesWorkspace/>;
}
