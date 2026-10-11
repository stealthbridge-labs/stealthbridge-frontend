import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {ContractExplorer} from "@/components/contract-explorer";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Soroban Registry Explorer | StealthBridge",
 description:"Read-only Testnet registry ABI and deployment verification.",
 robots:{index:false,follow:false}
};

export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <ContractExplorer/>;
}
