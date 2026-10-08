import type {Metadata} from "next";
import {ProductStory} from "@/components/product-story";
export const metadata:Metadata={
 title:"StealthBridge Business — Institutional settlement research",
 description:"Explore StealthBridge Business: research into privacy-conscious, accountable cross-border settlement workflows. Not a live payout service.",
 alternates:{canonical:"/business"},
 openGraph:{title:"StealthBridge Business — Institutional settlement research",description:"Explore StealthBridge Business: research into privacy-conscious, accountable cross-border settlement workflows. Not a live payout service.",url:"/business",type:"website"},
};
export default function Page(){return <ProductStory product="business"/>;}
