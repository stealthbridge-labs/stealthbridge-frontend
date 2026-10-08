import type {Metadata} from "next";
import {ProductStory} from "@/components/product-story";
export const metadata:Metadata={
 title:"StealthBridge Send — A future remittance experience",
 description:"Discover StealthBridge Send, an in-development approach to clearer, more privacy-conscious international transfers.",
 alternates:{canonical:"/send"},
 openGraph:{title:"StealthBridge Send — A future remittance experience",description:"Discover StealthBridge Send, an in-development approach to clearer, more privacy-conscious international transfers.",url:"/send",type:"website"},
};
export default function Page(){return <ProductStory product="send"/>;}
