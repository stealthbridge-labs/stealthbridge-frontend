import type {Metadata} from "next";
import {ProductStory} from "@/components/product-story";
export const metadata:Metadata={
 title:"StealthBridge Business — Confidential settlement solutions",
 description:"Understand StealthBridge Business: controlled international settlements, institutional confidentiality, reconciliation and accountability.",
 alternates:{canonical:"/business"},
 openGraph:{title:"StealthBridge Business — Move value with purpose",description:"Explore confidentiality and clarity for cross-border business payments.",url:"/business",type:"website"}
};
export default function Page(){return <ProductStory product="business"/>;}
