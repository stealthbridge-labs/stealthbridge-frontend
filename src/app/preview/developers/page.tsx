import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {DeveloperWorkspace} from "@/components/developer-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Developer integration | StealthBridge",
 description:"Read-only Testnet developer integration diagnostic and SDK quickstart.",
 robots:{index:false,follow:false},
};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <DeveloperWorkspace/>;
}
