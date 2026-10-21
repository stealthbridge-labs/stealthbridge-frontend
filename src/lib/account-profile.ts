import {canonicalStellarAccountAddress} from "./stellar-address";
export type ProfileUseCase="personal"|"business"|"both";
export type ProfileInput={display_name:string;use_case:ProfileUseCase;residence_country:string|null};
export type CustomerProfile=ProfileInput&{updated_at_unix:number};
export type ProfileEnvelope={
 schema_version:1;network:"testnet";source:"neon-customer-profiles";
 account_address:string;profile:CustomerProfile|null;
 payment_execution_enabled:false;organization_payment_authorized:false;
};
const exact=(value:Record<string,unknown>,keys:string[])=>
 Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
export function validProfileInput(value:unknown):value is ProfileInput{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return exact(v,["display_name","use_case","residence_country"])&&
  typeof v.display_name==="string"&&[...v.display_name].length>0&&
  [...v.display_name].length<=80&&v.display_name.trim()===v.display_name&&
  !/[<>\u0000-\u001f\u007f]/.test(v.display_name)&&
  ["personal","business","both"].includes(String(v.use_case))&&
  (v.residence_country===null||typeof v.residence_country==="string"&&
   /^[A-Z]{2}$/.test(v.residence_country));
}
export function validProfileEnvelope(data:unknown,address:string):data is ProfileEnvelope{
 const expected=canonicalStellarAccountAddress(address);
 if(!expected||!data||typeof data!=="object"||Array.isArray(data))return false;
 const v=data as Record<string,unknown>;
 if(!exact(v,["schema_version","network","source","account_address","profile",
    "payment_execution_enabled","organization_payment_authorized"])||
    v.schema_version!==1||v.network!=="testnet"||v.source!=="neon-customer-profiles"||
    v.account_address!==expected||v.payment_execution_enabled!==false||
    v.organization_payment_authorized!==false)return false;
 if(v.profile===null)return true;
 if(!v.profile||typeof v.profile!=="object"||Array.isArray(v.profile))return false;
 const p=v.profile as Record<string,unknown>;
 const {updated_at_unix,...input}=p;
 return validProfileInput(input)&&Object.keys(p).length===4&&
  Number.isSafeInteger(updated_at_unix)&&Number(updated_at_unix)>0;
}
export async function loadCustomerProfile(address:string,signal?:AbortSignal):Promise<ProfileEnvelope>{
 const response=await fetch("/api/account/profile",{
  method:"GET",cache:"no-store",credentials:"same-origin",signal
 });
 if(!response.ok)throw Error("We couldn't load your saved profile.");
 const data:unknown=await response.json();
 if(!validProfileEnvelope(data,address))throw Error("Your profile response couldn't be verified.");
 return data;
}
export async function saveCustomerProfile(address:string,input:ProfileInput):Promise<ProfileEnvelope>{
 if(!validProfileInput(input))throw new TypeError("Invalid profile preferences.");
 const response=await fetch("/api/account/profile",{
  method:"PATCH",cache:"no-store",credentials:"same-origin",
  headers:{"content-type":"application/json"},body:JSON.stringify(input)
 });
 if(!response.ok){
  if(response.status===409)throw Error("This update was already processed. Refresh your profile.");
  if(response.status===401)throw Error("Your session has expired. Please sign in again.");
  throw Error("Your profile couldn't be saved. No changes have been confirmed.");
 }
 const data:unknown=await response.json();
 if(!validProfileEnvelope(data,address)||data.profile===null)
  throw Error("The saved profile response couldn't be verified.");
 return data;
}
