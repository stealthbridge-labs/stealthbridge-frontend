import {canonicalStellarAccountAddress} from "./stellar-address.ts";
import type {OrganizationRole} from "./account-directory";

export type OrganizationTeamMember={
 account_address:string;role:OrganizationRole;joined_at_unix:number
};
export type OrganizationTeamRecord={
 id:string;display_name:string;status:"pending"|"active";your_role:"owner"|"admin"
};
export type OrganizationTeam={
 schema_version:1;network:"testnet";source:"neon-organization-team";
 account_address:string;organization:OrganizationTeamRecord;
 members:OrganizationTeamMember[];next_cursor:string|null;
 business_verified:false;invitation_issuance_enabled:false;
 payment_execution_enabled:false;organization_payment_authorized:false
};
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const roles=new Set(["owner","admin","operator","approver","viewer"]);
const keys=(value:Record<string,unknown>,expected:string[])=>
 Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));

/** This verifies wire integrity, NOT legal company identity or payments. */
export function validOrganizationTeam(
 data:unknown,organizationId:string,expectedAddress:string
):data is OrganizationTeam{
 const account=canonicalStellarAccountAddress(expectedAddress);
 if(!account||!uuid.test(organizationId)||!data||
    typeof data!=="object"||Array.isArray(data))return false;
 const v=data as Record<string,unknown>;
 if(!keys(v,["schema_version","network","source","account_address","organization",
  "members","next_cursor","business_verified","invitation_issuance_enabled",
  "payment_execution_enabled","organization_payment_authorized"])||
  v.schema_version!==1||v.network!=="testnet"||v.source!=="neon-organization-team"||
  v.account_address!==account||v.business_verified!==false||
  v.invitation_issuance_enabled!==false||v.payment_execution_enabled!==false||
  v.organization_payment_authorized!==false||!Array.isArray(v.members)||
  v.members.length>25||!v.organization||typeof v.organization!=="object"||
  Array.isArray(v.organization))return false;
 const org=v.organization as Record<string,unknown>;
 if(!keys(org,["id","display_name","status","your_role"])||
  org.id!==organizationId||typeof org.display_name!=="string"||
  !org.display_name.trim()||org.display_name.trim()!==org.display_name||
  org.display_name.length>120||!["pending","active"].includes(String(org.status))||
  !["owner","admin"].includes(String(org.your_role))||
  org.status==="pending"&&org.your_role!=="owner")return false;
 const seen=new Set<string>();
 let last="";
 for(const item of v.members){
  if(!item||typeof item!=="object"||Array.isArray(item))return false;
  const m=item as Record<string,unknown>;
  const addr=typeof m.account_address==="string"?
   canonicalStellarAccountAddress(m.account_address):null;
  if(!keys(m,["account_address","role","joined_at_unix"])||
   !addr||addr!==m.account_address||seen.has(addr)||
   addr<=last||!roles.has(String(m.role))||
   !Number.isSafeInteger(m.joined_at_unix)||Number(m.joined_at_unix)<=0)return false;
  seen.add(addr);last=addr;
 }
 if(v.next_cursor!==null&&
   (typeof v.next_cursor!=="string"||
    canonicalStellarAccountAddress(v.next_cursor)!==v.next_cursor||
    v.next_cursor!==last||v.members.length!==25))return false;
 if(org.status==="pending"&&
  (v.members.length!==1||v.next_cursor!==null||
   (v.members[0] as Record<string,unknown>).account_address!==account||
   (v.members[0] as Record<string,unknown>).role!=="owner"))return false;
 return true;
}

export async function loadOrganizationTeam(
 organizationId:string,address:string,after?:string,signal?:AbortSignal
):Promise<OrganizationTeam>{
 if(!uuid.test(organizationId)||!canonicalStellarAccountAddress(address)||
  after!==undefined&&!canonicalStellarAccountAddress(after))
  throw new TypeError("Invalid organization or account.");
 const suffix=after?"?after="+encodeURIComponent(after):"";
 const response=await fetch("/api/account/organizations/"+organizationId+"/team"+suffix,{
  method:"GET",cache:"no-store",credentials:"same-origin",
  headers:{accept:"application/json"},signal
 });
 if(!response.ok){
  if(response.status===401)throw Error("Session expired. Please sign in again.");
  if(response.status===403||response.status===404)
   throw Error("You do not have access to that organization's team.");
  throw Error("The team records are temporarily unavailable.");
 }
 const result:unknown=await response.json();
 if(!validOrganizationTeam(result,organizationId,address))
  throw Error("The returned team records could not be verified.");
 if(after&&result.members.some(member=>member.account_address<=after))
  throw Error("The returned team page overlaps existing records.");
 return result;
}
