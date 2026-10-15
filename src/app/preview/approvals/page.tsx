import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {BusinessReviewWorkspace} from "@/components/business-review-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Business approval controls | StealthBridge",
 description:"Read-only maker-checker policy design and backend product status.",
 robots:{index:false,follow:false},
};
export default function Page(){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview")notFound();
 return <BusinessReviewWorkspace/>;
}
