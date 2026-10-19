/** Exact public Testnet contract-instance observation, NOT smart-wallet ownership. */
export interface ContractObservation {
 schema_version:1;
 network:"testnet";
 source:"stellar-rpc/getLedgerEntries";
 contract_address:string;
 contract_instance_found:boolean;
 observed_ledger_sequence:number;
 executable_wasm_hash:string|null;
 live_until_ledger:number|null;
 smart_account_verified:false;
 signer_authority_verified:false;
 privacy_verified:false;
 payment_execution_enabled:false;
 fee_collection_enabled:false;
}
export function validContractObservation(data:unknown,address:string):data is ContractObservation {
 if(!data||typeof data!=="object"||Array.isArray(data))return false;
 const v=data as Record<string,unknown>;
 const keys=["schema_version","network","source","contract_address","contract_instance_found",
  "observed_ledger_sequence","executable_wasm_hash","live_until_ledger",
  "smart_account_verified","signer_authority_verified","privacy_verified",
  "payment_execution_enabled","fee_collection_enabled"];
 if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return false;
 if(v.schema_version!==1||v.network!=="testnet"||v.source!=="stellar-rpc/getLedgerEntries"||
  v.contract_address!==address||typeof v.contract_instance_found!=="boolean"||
  !Number.isSafeInteger(v.observed_ledger_sequence)||Number(v.observed_ledger_sequence)<1||
  v.smart_account_verified!==false||v.signer_authority_verified!==false||
  v.privacy_verified!==false||v.payment_execution_enabled!==false||
  v.fee_collection_enabled!==false)return false;
 if(v.contract_instance_found===false)return v.executable_wasm_hash===null&&v.live_until_ledger===null;
 return typeof v.executable_wasm_hash==="string"&&/^[a-f0-9]{64}$/.test(v.executable_wasm_hash)&&
   Number.isSafeInteger(v.live_until_ledger)&&Number(v.live_until_ledger)>=Number(v.observed_ledger_sequence);
}
