import {canonicalStellarAccountAddress} from "./stellar-address.ts";
/** Only public Testnet account existence. No identity, trustline or custody claims. */
export interface ClassicRecipientPresence{
 schema_version:1;network:"testnet";source:"stellar-horizon/account-presence";
 address:string;observed_at_unix:number;classic_account_found:boolean;
 ownership_verified:false;asset_acceptance_verified:false;payment_execution_enabled:false;
}
const fields=["schema_version","network","source","address","observed_at_unix",
 "classic_account_found","ownership_verified","asset_acceptance_verified",
 "payment_execution_enabled"].sort().join(",");
export function validClassicRecipientPresence(
 input:unknown,address:string,now=Math.floor(Date.now()/1000)
):input is ClassicRecipientPresence{
 if(canonicalStellarAccountAddress(address)!==address||!input||
    typeof input!=="object"||Array.isArray(input))return false;
 const v=input as Record<string,unknown>;
 return Object.keys(v).sort().join(",")===fields&&v.schema_version===1&&
  v.network==="testnet"&&v.source==="stellar-horizon/account-presence"&&
  v.address===address&&typeof v.observed_at_unix==="number"&&
  Number.isSafeInteger(v.observed_at_unix)&&v.observed_at_unix>=now-90&&
  v.observed_at_unix<=now+30&&typeof v.classic_account_found==="boolean"&&
  v.ownership_verified===false&&v.asset_acceptance_verified===false&&
  v.payment_execution_enabled===false;
}
export function currentClassicRecipient(
 input:unknown,address:string,now=Math.floor(Date.now()/1000)
):boolean{
 return validClassicRecipientPresence(input,address,now)&&input.classic_account_found;
}
