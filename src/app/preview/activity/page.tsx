import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {TestnetActivity} from "@/components/testnet-activity";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Testnet Activity | StealthBridge",
 description:"Read-only historical public Testnet contract event observations.",
 robots:{index:false,follow:false}
};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <TestnetActivity/>;
}
