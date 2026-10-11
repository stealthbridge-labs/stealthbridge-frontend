import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {PreviewOverview} from "@/components/preview-overview";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"StealthBridge Testnet Workspace",description:"Read-only live Testnet integration dashboard.",robots:{index:false,follow:false}};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <PreviewOverview/>;
}
