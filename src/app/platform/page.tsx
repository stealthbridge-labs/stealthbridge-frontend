import type {Metadata} from "next";
import {ProductStory} from "@/components/product-story";
export const metadata:Metadata={
 title:"StealthBridge Platform — Stellar infrastructure research",
 description:"Learn about StealthBridge platform architecture, Stellar Testnet research, and the boundaries of its current capabilities.",
 alternates:{canonical:"/platform"},
 openGraph:{title:"StealthBridge Platform — Stellar infrastructure research",description:"Learn about StealthBridge platform architecture, Stellar Testnet research, and the boundaries of its current capabilities.",url:"/platform",type:"website"},
};
export default function Page(){return <ProductStory product="platform"/>;}
