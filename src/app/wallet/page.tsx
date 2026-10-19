import type {Metadata} from "next";
import {WalletHub} from "@/components/wallet-hub";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Connect wallet — StealthBridge",
 description:"Connect Freighter to your Stellar Testnet account and prepare privacy-conscious transfers. Transactions are not yet enabled.",
 robots:{index:false,follow:false}
};
export default async function Page({searchParams}:{searchParams:Promise<{flow?:string}>}){
 const {flow}=await searchParams;
 return <WalletHub flow={flow==="business"?"business":"send"}/>;
}
