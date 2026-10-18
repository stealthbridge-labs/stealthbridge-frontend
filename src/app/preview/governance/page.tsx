import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {GovernanceWorkspace} from "@/components/governance-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Verified Testnet governance | StealthBridge",description:"Public Soroban governance deployment receipts observed on Stellar Testnet.",robots:{index:false,follow:false}};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <GovernanceWorkspace/>;
}
