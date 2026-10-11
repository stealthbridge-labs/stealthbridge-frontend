import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {CorridorDirectory} from "@/components/corridor-directory";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Testnet Corridor Directory | StealthBridge",description:"Filtered read-only operator corridor configurations.",robots:{index:false,follow:false}};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <CorridorDirectory/>;
}
