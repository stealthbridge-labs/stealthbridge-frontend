import type {Metadata} from "next";
import {WalletHub} from "@/components/wallet-hub";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"StealthBridge Business — Secure Testnet workspace",
 description:"Connect your Stellar wallet and prepare a privacy-conscious business settlement. Real payments remain disabled.",
 alternates:{canonical:"/business"},
 openGraph:{title:"StealthBridge Business — Secure Testnet workspace",description:"Business settlement preparation and wallet integration.",url:"/business",type:"website"}
};
export default function Page(){return <WalletHub flow="business"/>;}
