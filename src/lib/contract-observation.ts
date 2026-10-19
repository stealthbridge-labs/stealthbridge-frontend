/** Public Soroban contract observation, never authorization to move funds. */
export type ContractObservation={
 contract_address:string;contract_instance_found:boolean;
 observed_ledger_sequence:number;executable_wasm_hash:string|null;
 smart_account_verified:false;signer_authority_verified:false;
 payment_execution_enabled:false;fee_collection_enabled:false;
};
export function validContractObservation(value:unknown,address:string):value is ContractObservation{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return v.schema_version===1&&v.network==="testnet"&&v.source==="stellar-rpc/getLedgerEntries"&&
 v.contract_address===address&&typeof v.contract_instance_found==="boolean"&&
 Number.isSafeInteger(v.observed_ledger_sequence)&&Number(v.observed_ledger_sequence)>0&&
 v.smart_account_verified===false&&v.signer_authority_verified===false&&
 v.payment_execution_enabled===false&&v.fee_collection_enabled===false&&
 v.privacy_verified===false&&
 (v.contract_instance_found?typeof v.executable_wasm_hash==="string"&&/^[0-9a-f]{64}$/.test(v.executable_wasm_hash)&&
 Number.isSafeInteger(v.live_until_ledger)&&Number(v.live_until_ledger)>=Number(v.observed_ledger_sequence):
 v.executable_wasm_hash===null&&v.live_until_ledger===null);
}
