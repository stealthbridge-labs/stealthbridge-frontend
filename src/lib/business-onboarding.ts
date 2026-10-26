import {canonicalStellarAccountAddress} from "./stellar-address.ts";
export type PendingBusinessApplication={
 id:string;display_name:string;status:"pending";role:"owner"
};
export type BusinessOnboardingEnvelope={
 schema_version:1;network:"testnet";source:"neon-pending-business-applications";
 account_address:string;applications:PendingBusinessApplication[];has_more:boolean;
 organization_verified:false;payment_execution_enabled:false;
 organization_payment_authorized:false;
};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
function exact(v:Record<string,unknown>,keys:string[]):boolean{
 return Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
}
export function validBusinessApplicationName(input:unknown):input is string{
 return typeof input==="string"&&input.length>0&&input.length<=120&&
 input.trim()===input&&!/[<>\u0000-\u001f\u007f]/.test(input);
}
export function validBusinessOnboarding(value:unknown,address:string):value is BusinessOnboardingEnvelope{
 const signer=canonicalStellarAccountAddress(address);
 if(!signer||!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 if(!exact(v,["schema_version","network","source","account_address","applications",
  "has_more","organization_verified","payment_execution_enabled","organization_payment_authorized"])||
  v.schema_version!==1||v.network!=="testnet"||
  v.source!=="neon-pending-business-applications"||v.account_address!==signer||
  v.has_more!==true&&v.has_more!==false||v.organization_verified!==false||
  v.payment_execution_enabled!==false||v.organization_payment_authorized!==false||
  !Array.isArray(v.applications)||v.applications.length>10)return false;
 const seen=new Set<string>();
 for(const value of v.applications){
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const entry=value as Record<string,unknown>;
  if(!exact(entry,["id","display_name","status","role"])||
   typeof entry.id!=="string"||!UUID.test(entry.id)||seen.has(entry.id.toLowerCase())||
   !validBusinessApplicationName(entry.display_name)||
   entry.status!=="pending"||entry.role!=="owner")return false;
  seen.add(entry.id.toLowerCase());
 }
 return true;
}
export async function loadBusinessOnboarding(address:string,signal?:AbortSignal):Promise<BusinessOnboardingEnvelope>{
 const response=await fetch("/api/account/business-onboarding",{
  method:"GET",credentials:"same-origin",cache:"no-store",signal
 });
 if(!response.ok)throw Error("Your business applications could not be loaded.");
 const value:unknown=await response.json();
 if(!validBusinessOnboarding(value,address))throw Error("Unverified business application records.");
 return value;
}
export async function registerBusinessOnboarding(
 address:string,displayName:string
):Promise<BusinessOnboardingEnvelope>{
 if(!validBusinessApplicationName(displayName))throw new TypeError("Invalid business name.");
 const response=await fetch("/api/account/business-onboarding",{
  method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({display_name:displayName})
 });
 if(!response.ok){
  if(response.status===429)throw Error("You have reached the current limit of three pending business applications.");
  if(response.status===401)throw Error("Your session expired. Please sign in again.");
  if(response.status===409)throw Error("This request was already processed. Refresh the application list.");
  throw Error("We couldn't register the application. Please try again.");
 }
 const result:unknown=await response.json();
 if(!validBusinessOnboarding(result,address)||result.applications.length!==1)
  throw Error("The registered application could not be verified.");
 return result;
}

const businessId=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export async function amendPendingBusiness(
 address:string,organizationId:string,expectedName:string,newName:string
):Promise<BusinessOnboardingEnvelope>{
 if(!businessId.test(organizationId)||!validBusinessApplicationName(expectedName)||
  !validBusinessApplicationName(newName)||expectedName===newName)
  throw new TypeError("Enter a different valid application name.");
 const response=await fetch("/api/account/business-onboarding",{
  method:"PATCH",credentials:"same-origin",cache:"no-store",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({organization_id:organizationId,
   expected_display_name:expectedName,display_name:newName})
 });
 if(!response.ok)throw Error(response.status===409?
  "The application changed or now has protected records. Refresh before editing.":
  response.status===404?"This pending application is no longer available to you.":
  "Couldn't update the application. Please retry.");
 const result:unknown=await response.json();
 if(!validBusinessOnboarding(result,address)||result.applications.length!==1||
  result.applications[0].id!==organizationId||result.applications[0].display_name!==newName)
  throw Error("The updated application could not be verified.");
 return result;
}
export async function withdrawPendingBusiness(
 address:string,organizationId:string,confirmationName:string
):Promise<BusinessOnboardingEnvelope>{
 if(!businessId.test(organizationId)||!validBusinessApplicationName(confirmationName))
  throw new TypeError("Invalid pending application.");
 const response=await fetch("/api/account/business-onboarding",{
  method:"DELETE",credentials:"same-origin",cache:"no-store",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({organization_id:organizationId,confirm_display_name:confirmationName})
 });
 if(!response.ok)throw Error(response.status===409?
  "This application has changed or contains protected history and cannot be withdrawn.":
  response.status===404?"The pending application is no longer available to you.":
  "Couldn't withdraw the application. Please retry.");
 const result:unknown=await response.json();
 if(!validBusinessOnboarding(result,address)||result.applications.length!==0)
  throw Error("The withdrawal could not be verified.");
 return result;
}
