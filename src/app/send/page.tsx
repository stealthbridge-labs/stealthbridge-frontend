import type {Metadata} from "next";
import {ProductStory} from "@/components/product-story";
export const metadata:Metadata={
 title:"StealthBridge Send — Personal cross-border transfers",
 description:"Explore a more thoughtful international remittance experience, with clearer delivery steps, privacy boundaries and honest payment availability.",
 alternates:{canonical:"/send"},
 openGraph:{title:"StealthBridge Send — For people across borders",description:"Discover the personal side of StealthBridge.",url:"/send",type:"website"}
};
export default function Page(){return <ProductStory product="send"/>;}
