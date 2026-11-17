import {SMART_ACCOUNT_PINS} from "./smart-account-pins.ts";
import type {ApiSmartAccountKitEntry,ApiSmartAccountKitObservation} from "./sdk-api-wire.v0.2.ts";

export {SMART_ACCOUNT_PINS};
export const KIT_MAX_AGE_SECONDS=90;
export const KIT_LOW_TTL_LEDGERS=120960;
const MAX_LEDGER_U32=4294967295;
export interface SmartAccountKitEntry extends ApiSmartAccountKitEntry {
 name:typeof SMART_ACCOUNT_PINS[number][0];
}
export interface SmartAccountKit extends Omit<ApiSmartAccountKitObservation,"entries">{
 entries:SmartAccountKitEntry[];
}
const FALSE_FLAGS=["customer_smart_account_factory_deployed","customer_smart_account_created",
 "credential_recovery_verified","privacy_proofs_verified","mainnet_enabled","financial_execution_enabled"] as const;
function shape(value:unknown,keys:readonly string[]):value is Record<string,unknown>{
 return value!==null&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
}
const positive=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>0;
const hash=(value:unknown):value is string=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value)&&!/^0+$/.test(value);
/** Public code observations cannot grant customer enrollment, privacy or financial authority. */
export function validSmartAccountKit(value:unknown,now=Math.floor(Date.now()/1000)):value is SmartAccountKit {
 if(!shape(value,["schema_version","network","source","kit_version","observed_at_unix",
  "observed_ledger_sequence","entries","all_entries_healthy","operator_managed_deployment",...FALSE_FLAGS])||
  value.schema_version!==1||value.network!=="testnet"||value.source!=="stellar-rpc/pinned-smart-account-kit"||
  value.kit_version!=="0.10.0"||!positive(value.observed_at_unix)||
  !positive(value.observed_ledger_sequence)||value.observed_ledger_sequence>MAX_LEDGER_U32||
  now-value.observed_at_unix<0||now-value.observed_at_unix>KIT_MAX_AGE_SECONDS||
  value.operator_managed_deployment!==true||FALSE_FLAGS.some(key=>value[key]!==false)||
  !Array.isArray(value.entries)||value.entries.length!==7)return false;
 const ledger=value.observed_ledger_sequence;
 if(!value.entries.every((entry:unknown,index:number)=>{
  const [name,kind,pin]=SMART_ACCOUNT_PINS[index];
  if(!shape(entry,["name","kind","expected_wasm_hash","observed_wasm_hash","status","live_until_ledger","ttl_remaining_ledgers"])||
   entry.name!==name||entry.kind!==kind||entry.expected_wasm_hash!==pin||!hash(pin)||
   (entry.observed_wasm_hash!==null&&!hash(entry.observed_wasm_hash)))return false;
  const until=entry.live_until_ledger,ttl=entry.ttl_remaining_ledgers;
  if(entry.status==="unavailable"){
   // A zero/expired TTL may still return matching WASM identity. It is not
   // evidence of a live executable contract.
   return (entry.observed_wasm_hash===null||entry.observed_wasm_hash===pin)&&
    until===null&&ttl===null;
  }
  if(!positive(until)||until>MAX_LEDGER_U32||!Number.isSafeInteger(ttl)||typeof ttl!=="number"||ttl<0||
    until-ledger!==ttl||!hash(entry.observed_wasm_hash))return false;
  if(entry.status==="mismatch")return entry.observed_wasm_hash!==pin;
  if(entry.observed_wasm_hash!==pin)return false;
  return entry.status==="live"?ttl>KIT_LOW_TTL_LEDGERS:
   entry.status==="low_ttl"&&ttl<=KIT_LOW_TTL_LEDGERS;
 }))return false;
 return value.all_entries_healthy===value.entries.every((entry:SmartAccountKitEntry)=>entry.status==="live");
}
export async function loadSmartAccountKit(signal?:AbortSignal):Promise<SmartAccountKit>{
 const response=await fetch("/api/public/smart-account-kit",{
  method:"GET",cache:"no-store",redirect:"error",credentials:"omit",
  headers:{accept:"application/json"},
  signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)
 });
 if(!response.ok)throw Error("KIT_UNAVAILABLE");
 const value:unknown=await response.json();
 if(!validSmartAccountKit(value))throw Error("KIT_UNAVAILABLE");
 return value;
}
