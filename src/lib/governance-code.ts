/** Live Testnet contract-instance executable hash and TTL snapshots.
 * Read-only: no full WASM download, current admin proof or funds movement.
 */
export interface GovernanceExecutable {
 name:"corridor-registry"|"policy-registry"|"governance-gate";
 contract_id:string;
 current_executable_wasm_hash:string;
 release_executable_wasm_hash:string;
 matches_reviewed_release:boolean;
 last_modified_ledger:number;
 live_until_ledger:number;
}
export interface GovernanceCodeObservation {
 schema_version:1;network:"testnet";source:"stellar-rpc/getLedgerEntries";
 observed_ledger_sequence:number;contracts:GovernanceExecutable[];
 all_executable_hashes_match_release:boolean;
 current_administrator_verified:false;
 wasm_bytes_freshly_downloaded:false;
 privacy_verified:false;
 payment_execution_enabled:false;
 fee_collection_enabled:false;
}
const PINNED=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB","588d17f99850272f2f18e6ee407d94329b4f8ae415c2f6b71993cf59f4139099"],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5","856186ba3dca1feff010c670bd1ae9818bf69e284304273f943745603b9a7912"],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV","66b40fe5ee4f704a91acf39922ed130cc1eb4fc0cdc3c5ee5a30614921f4aa81"]
] as const;
function object(v:unknown):v is Record<string,unknown>{
 return v!==null&&typeof v==="object"&&!Array.isArray(v);
}
export function validGovernanceCode(value:unknown):value is GovernanceCodeObservation{
 if(!object(value)||value.schema_version!==1||value.network!=="testnet"||
   value.source!=="stellar-rpc/getLedgerEntries"||
   !Number.isSafeInteger(value.observed_ledger_sequence)||
   Number(value.observed_ledger_sequence)<5244293||
   value.current_administrator_verified!==false||
   value.wasm_bytes_freshly_downloaded!==false||
   value.privacy_verified!==false||
   value.payment_execution_enabled!==false||
   value.fee_collection_enabled!==false||
   typeof value.all_executable_hashes_match_release!=="boolean"||
   !Array.isArray(value.contracts)||value.contracts.length!==PINNED.length)return false;
 let all=true;
 const list:unknown[]=value.contracts;
 for(let i=0;i<PINNED.length;i++){
  const [name,id,hash]=PINNED[i];
  const entry=list[i];
  if(!object(entry)||entry.name!==name||entry.contract_id!==id||
    entry.release_executable_wasm_hash!==hash||
    typeof entry.current_executable_wasm_hash!=="string"||
    !/^[0-9a-f]{64}$/.test(entry.current_executable_wasm_hash)||
    typeof entry.matches_reviewed_release!=="boolean"||
    entry.matches_reviewed_release!==(entry.current_executable_wasm_hash===hash)||
    !Number.isSafeInteger(entry.last_modified_ledger)||
    Number(entry.last_modified_ledger)<=0||
    Number(entry.last_modified_ledger)>Number(value.observed_ledger_sequence)||
    !Number.isSafeInteger(entry.live_until_ledger)||
    Number(entry.live_until_ledger)<Number(value.observed_ledger_sequence))
   return false;
  all=all&&entry.matches_reviewed_release;
 }
 return value.all_executable_hashes_match_release===all;
}
