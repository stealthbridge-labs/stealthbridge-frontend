import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {BusinessBatchPlanner} from "@/components/business-batch-planner";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Batch planner — StealthBridge Business",
 description:"Review multiple draft cross-border corridors in one secure browser workspace.",
 robots:{index:false,follow:false}};
export default async function BusinessBatchPage(){
 await requireWalletIdentity();
 return <BusinessBatchPlanner/>;
}
