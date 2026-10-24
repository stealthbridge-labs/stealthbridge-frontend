import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {requireWalletIdentity} from "@/lib/auth-server";
import {OrganizationTeamWorkspace} from "@/components/organization-team-workspace";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Business team and status — StealthBridge"};
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
export default async function BusinessTeamPage({
 params
}:{params:Promise<{id:string}>}){
 const identity=await requireWalletIdentity();
 const {id}=await params;
 if(!uuid.test(id)||id==="00000000-0000-0000-0000-000000000000")notFound();
 return <OrganizationTeamWorkspace organizationId={id} address={identity.address}/>;
}
