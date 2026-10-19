export interface PublicWalletStatus{
 source:"stealthbridge-public-testnet-read";
 network:"testnet";
 passphrase:"Test SDF Network ; September 2015";
 ledger_sequence:number;
 ledger_closed_at_unix:string;
 payment_execution_enabled:false;
 confidential_token_verified:false;
 private_payments_verified:false;
 fiat_payouts_enabled:false;
 smart_account_deployment_verified:false;
}
const HEAD_AGE=180;
export function validPublicWalletStatus(value:unknown):value is PublicWalletStatus{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 const keys=["source","network","passphrase","ledger_sequence","ledger_closed_at_unix",
  "payment_execution_enabled","confidential_token_verified","private_payments_verified",
  "fiat_payouts_enabled","smart_account_deployment_verified"];
 if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return false;
 if(v.source!=="stealthbridge-public-testnet-read"||v.network!=="testnet"||
  v.passphrase!=="Test SDF Network ; September 2015"||
  !Number.isSafeInteger(v.ledger_sequence)||Number(v.ledger_sequence)<1||
  typeof v.ledger_closed_at_unix!=="string"||!/^[0-9]{1,20}$/.test(v.ledger_closed_at_unix))return false;
 const age=Math.floor(Date.now()/1000)-Number(v.ledger_closed_at_unix);
 return age>=-30&&age<=HEAD_AGE&&
  ["payment_execution_enabled","confidential_token_verified","private_payments_verified",
   "fiat_payouts_enabled","smart_account_deployment_verified"].every(k=>v[k]===false);
}
