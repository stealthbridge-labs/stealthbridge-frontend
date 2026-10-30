import {isContractStrKey} from "./observer-activity.ts";
/** A live public contract record. Not proof of ownership, signer or asset acceptance. */
export interface RecipientPresence{
 schema_version:1; network:"testnet"; source:"stellar-rpc/recipient-presence";
 address:string; observed_at_unix:number; observed_ledger_sequence:number;
 contract_instance_found:boolean; smart_account_verified:false;
 signer_authority_verified:false; recipient_asset_eligibility_verified:false;
 privacy_verified:false; payment_execution_enabled:false;
}
const keys=["schema_version","network","source","address","observed_at_unix",
 "observed_ledger_sequence","contract_instance_found","smart_account_verified",
 "signer_authority_verified","recipient_asset_eligibility_verified",
 "privacy_verified","payment_execution_enabled"].sort().join(",");
export function validRecipientPresence(
 payload:unknown,address:string,now=Math.floor(Date.now()/1000)
):payload is RecipientPresence{
 if(!isContractStrKey(address)||!payload||typeof payload!=="object"||Array.isArray(payload))return false;
 const v=payload as Record<string,unknown>;
 return Object.keys(v).sort().join(",")===keys&&
  v.schema_version===1&&v.network==="testnet"&&v.source==="stellar-rpc/recipient-presence"&&
  v.address===address&&
  typeof v.observed_at_unix==="number"&&Number.isSafeInteger(v.observed_at_unix)&&
  v.observed_at_unix>=now-90&&v.observed_at_unix<=now+30&&
  typeof v.observed_ledger_sequence==="number"&&Number.isSafeInteger(v.observed_ledger_sequence)&&
  v.observed_ledger_sequence>0&&typeof v.contract_instance_found==="boolean"&&
  ["smart_account_verified","signer_authority_verified","recipient_asset_eligibility_verified",
   "privacy_verified","payment_execution_enabled"].every(key=>v[key]===false);
}
export function currentRecipientContract(
 payload:unknown,address:string,now=Math.floor(Date.now()/1000)
):boolean{
 return validRecipientPresence(payload,address,now)&&payload.contract_instance_found;
}
