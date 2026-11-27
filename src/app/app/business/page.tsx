import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {requireWalletIdentity} from "@/lib/auth-server";
import {BusinessWorkspace} from "@/components/business/business-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Business workspace — StealthBridge",
 robots:{index:false,follow:false}};
export default async function AppBusiness({
 searchParams
}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const identity=await requireWalletIdentity();
 const params=await searchParams;
 const route=params.corridor;
 if(Object.keys(params).length===1&&typeof route==="string"&&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(route))
   redirect("/app/business/payments?corridor="+route.toLowerCase());
 return <BusinessWorkspace address={identity.address}
  invitationsEnabled={process.env.STEALTHBRIDGE_TEAM_INVITES_ENABLED==="true"}/>;
}
