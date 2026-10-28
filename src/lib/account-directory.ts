import {canonicalStellarAccountAddress} from "./stellar-address.ts";
export type OrganizationRole="owner"|"admin"|"operator"|"approver"|"viewer";
export type AccountOrganization={id:string;display_name:string;role:OrganizationRole};
export type AccountDirectory={
 schema_version:1;network:"testnet";source:"neon-active-memberships";account_address:string;
 organizations:AccountOrganization[];has_more:boolean;
 payment_execution_enabled:false;organization_payment_authorized:false;
};
const idPattern=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const allowed=new Set(["owner","admin","operator","approver","viewer"]);
const exact=(v:Record<string,unknown>,keys:string[])=>
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function validAccountDirectory(payload:unknown,address:string):payload is AccountDirectory{
 const signer=canonicalStellarAccountAddress(address);
 if(!signer||!payload||typeof payload!=="object"||Array.isArray(payload))return false;
 const v=payload as Record<string,unknown>;
 if(!exact(v,["schema_version","network","source","account_address","organizations",
     "has_more","payment_execution_enabled","organization_payment_authorized"])||
    v.schema_version!==1||v.network!=="testnet"||v.source!=="neon-active-memberships"||
    v.account_address!==signer||v.has_more!==true&&v.has_more!==false||
    v.payment_execution_enabled!==false||v.organization_payment_authorized!==false||
    !Array.isArray(v.organizations)||v.organizations.length>25)return false;
 const seen=new Set<string>();
 for(const item of v.organizations){
  if(!item||typeof item!=="object"||Array.isArray(item))return false;
  const org=item as Record<string,unknown>;
  if(!exact(org,["id","display_name","role"])||typeof org.id!=="string"||
   !idPattern.test(org.id)||seen.has(org.id)||typeof org.display_name!=="string"||
   !org.display_name.trim()||org.display_name.trim()!==org.display_name||
   org.display_name.length>120||typeof org.role!=="string"||!allowed.has(org.role))return false;
  seen.add(org.id);
 }
 return true;
}
export async function getAccountDirectory(
 address:string,signal?:AbortSignal
):Promise<AccountDirectory>{
 const response=await fetch("/api/account/directory",{method:"GET",credentials:"same-origin",
  cache:"no-store",signal,headers:{accept:"application/json"}});
 if(!response.ok)throw new Error("Your organization membership information is temporarily unavailable.");
 const data:unknown=await response.json();
 if(!validAccountDirectory(data,address))throw new Error("Unable to verify your organization membership information.");
 return data;
}
