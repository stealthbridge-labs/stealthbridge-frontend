import {canonicalStellarAccountAddress} from "./stellar-address";
import {validEncryptedCustomerDraft,type EncryptedCustomerDraft} from "./private-draft-vault";
export type InstructionState="saved"|"cancelled"|"expired";
export interface PaymentInstructionInput {
 id:string;corridor_id:string;route_fingerprint:string;expires_in_seconds:number;encrypted:EncryptedCustomerDraft;
}
export interface PaymentInstruction {
 id:string;corridor_id:string;route_fingerprint:string;encrypted:EncryptedCustomerDraft;
 state:InstructionState;revision:1|2;created_at_unix:number;expires_at_unix:number;cancelled_at_unix:number|null;
}
export interface PaymentInstructionDirectory {
 schema_version:1;network:"testnet";source:"customer-payment-instructions";
 account_address:string;observed_at_unix:number;items:PaymentInstruction[];
 payment_execution_enabled:false;plaintext_available_to_server:false;
}
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const HASH=/^[a-f0-9]{64}$/;
const uuid=(v:unknown):v is string=>typeof v==="string"&&UUID.test(v)&&v!=="00000000-0000-0000-0000-000000000000";
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const positive=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>0;
export function validPaymentInstructionInput(v:unknown):v is PaymentInstructionInput {
 return record(v)&&exact(v,["id","corridor_id","route_fingerprint","expires_in_seconds","encrypted"])&&uuid(v.id)&&uuid(v.corridor_id)&&
  typeof v.route_fingerprint==="string"&&HASH.test(v.route_fingerprint)&&Number.isSafeInteger(v.expires_in_seconds)&&
  Number(v.expires_in_seconds)>=300&&Number(v.expires_in_seconds)<=86400&&validEncryptedCustomerDraft(v.encrypted)&&JSON.stringify(v.encrypted).length<=4000;
}
export function validPaymentInstructionDirectory(v:unknown,address:string):v is PaymentInstructionDirectory {
 if(!record(v)||!exact(v,["schema_version","network","source","account_address","observed_at_unix","items","payment_execution_enabled","plaintext_available_to_server"])||
  canonicalStellarAccountAddress(address)!==address||v.schema_version!==1||v.network!=="testnet"||v.source!=="customer-payment-instructions"||
  v.account_address!==address||v.payment_execution_enabled!==false||v.plaintext_available_to_server!==false||!positive(v.observed_at_unix)||
  Math.abs(Math.floor(Date.now()/1000)-v.observed_at_unix)>300||!Array.isArray(v.items)||v.items.length>50)return false;
 const ids=new Set<string>();let previous:PaymentInstruction|null=null;
 for(const row of v.items){
  if(!record(row)||!exact(row,["id","corridor_id","route_fingerprint","encrypted","state","revision","created_at_unix","expires_at_unix","cancelled_at_unix"])||
   !uuid(row.id)||ids.has(row.id)||!uuid(row.corridor_id)||typeof row.route_fingerprint!=="string"||!HASH.test(row.route_fingerprint)||
   !validEncryptedCustomerDraft(row.encrypted)||!positive(row.created_at_unix)||row.created_at_unix>v.observed_at_unix||!positive(row.expires_at_unix)||
   row.expires_at_unix-row.created_at_unix<300||row.expires_at_unix-row.created_at_unix>86400)return false;
  const cancelled=row.state==="cancelled";
  if(cancelled?(row.revision!==2||!positive(row.cancelled_at_unix)||row.cancelled_at_unix<row.created_at_unix||row.cancelled_at_unix>=row.expires_at_unix||row.cancelled_at_unix>v.observed_at_unix):
   (row.revision!==1||row.cancelled_at_unix!==null||row.state!==(v.observed_at_unix>=row.expires_at_unix?"expired":"saved")))return false;
  if(previous&&(previous.created_at_unix<row.created_at_unix||previous.created_at_unix===row.created_at_unix&&previous.id<=row.id))return false;
  ids.add(row.id);previous=row as unknown as PaymentInstruction;
 }
 return true;
}
/** Hash public catalog metadata only. This is not a quote, issuer certification or proof. */
export async function fingerprintInstructionRoute(route:{id:string;origin_country:string;destination_country:string;asset_code:string;asset_issuer:string|null;privacy_rail:string}):Promise<string>{
 if(!uuid(route.id)||!/^([A-Z]{2})$/.test(route.origin_country)||!/^([A-Z]{2})$/.test(route.destination_country)||route.origin_country===route.destination_country||
  !/^[A-Za-z0-9_:-]{1,64}$/.test(route.asset_code)||!["private-payments","confidential-token"].includes(route.privacy_rail)||
  route.asset_issuer!==null&&canonicalStellarAccountAddress(route.asset_issuer)!==route.asset_issuer)throw new TypeError("Invalid instruction route");
 const text=`StealthBridge route snapshot v1\n${route.id}\n${route.origin_country}\n${route.destination_country}\n${route.asset_code}\n${route.asset_issuer??""}\n${route.privacy_rail}\n`;
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,"0")).join("");
}
export class PaymentInstructionError extends Error {
 constructor(public readonly status:number){super(status===429?"Too many instruction requests. Wait a minute and try again.":status===409?"Instruction changed, expired, route changed, or account storage is full. Refresh your records.":status===401?"Sign in again to access your instructions.":"Payment instruction storage is unavailable.");this.name="PaymentInstructionError";}
}
type Options={fetchImpl?:typeof fetch;signal?:AbortSignal};
async function request(method:string,body:unknown,options:Options):Promise<Response>{
 const response=await (options.fetchImpl??fetch)("/api/account/instructions",{method,credentials:"same-origin",cache:"no-store",
  signal:options.signal??AbortSignal.timeout(10000),...(method==="GET"?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
 if(!response.ok){await response.body?.cancel().catch(()=>{});throw new PaymentInstructionError(response.status);}return response;
}
export async function listPaymentInstructions(address:string,options:Options={}):Promise<PaymentInstructionDirectory>{
 if(canonicalStellarAccountAddress(address)!==address)throw new TypeError("Invalid account");
 const response=await request("GET",null,options);
 if(!response.headers.get("content-type")?.includes("application/json"))throw new TypeError("Unverified instruction content type");
 const reader=response.body?.getReader();if(!reader)throw new TypeError("Missing instruction body");
 let size=0;const parts:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;if(size>260000)throw new TypeError("Instruction response too large");parts.push(value);
 }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.byteLength;}
 const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 if(!validPaymentInstructionDirectory(data,address))throw new TypeError("Unverified instruction records");return data;
}
export async function savePaymentInstruction(input:PaymentInstructionInput,options:Options={}):Promise<void>{
 if(!validPaymentInstructionInput(input))throw new TypeError("Invalid encrypted instruction");
 const response=await request("PUT",input,options);if(response.status!==204)throw new PaymentInstructionError(502);
}
export async function cancelPaymentInstruction(id:string,revision:number,options:Options={}):Promise<void>{
 if(!uuid(id)||revision!==1)throw new TypeError("Invalid instruction cancellation");
 const response=await request("POST",{id,expected_revision:revision},options);if(response.status!==204)throw new PaymentInstructionError(502);
}
