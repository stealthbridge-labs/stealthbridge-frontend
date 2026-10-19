import type {Metadata} from "next";
import {WalletHub} from "@/components/wallet-hub";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"StealthBridge Send — Connect your wallet",
 description:"Connect a Stellar Testnet wallet and prepare an international transfer locally. Private payments remain disabled.",
 alternates:{canonical:"/send"},
 openGraph:{title:"StealthBridge Send — Connect your wallet",description:"Explore the real Stellar Testnet wallet experience.",url:"/send",type:"website"}
};
export default function Page(){return <WalletHub flow="send"/>;}
