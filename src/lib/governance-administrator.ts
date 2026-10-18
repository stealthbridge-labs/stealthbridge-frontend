/** Public current Testnet governance administrator storage reader.
 * Verified keys and executable hashes are checked by the Rust API, but a
 * public address does NOT prove possession of private signing material.
 */
import {canonicalStellarAccountAddress} from "./wallet.js";
export interface GovernanceAdministratorRecord {
 name:"corridor-registry"|"policy-registry"|"governance-gate";
 contract_id:string;
 current_administrator:string;
 pending_administrator:string|null;
 paused:boolean|null;
 matches_deployment_administrator:boolean;
}
export interface GovernanceAdministratorObservation {
 schema_version:1;network:"testnet";
 source:"stellar-rpc/getLedgerEntries/contract-instance-storage";
 observed_ledger_sequence:number;
 reviewed_release_executable_hashes_confirmed:true;
 administrator_entries_read_from_current_storage:true;
 same_administrator_for_all_contracts:boolean;
 all_administrators_match_deployment:boolean;
 release_administrator:string;
 contracts:GovernanceAdministratorRecord[];
 signer_possession_verified:false;
 fee_collection_enabled:false;
 payment_execution_enabled:false;
 privacy_verified:false;
}
const RELEASE_ADMIN="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const FIXED=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB"],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5"],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV"]
] as const;
function object(v:unknown):v is Record<string,unknown>{
 return v!==null&&typeof v==="object"&&!Array.isArray(v);
}
function canonicalG(value:unknown):value is string {
 return typeof value==="string"&&canonicalStellarAccountAddress(value)===value;
}
export function validGovernanceAdministrator(value:unknown):value is GovernanceAdministratorObservation{
 if(!object(value)||value.schema_version!==1||value.network!=="testnet"||
    value.source!=="stellar-rpc/getLedgerEntries/contract-instance-storage"||
    !Number.isSafeInteger(value.observed_ledger_sequence)||
    Number(value.observed_ledger_sequence)<5244293||
    value.reviewed_release_executable_hashes_confirmed!==true||
    value.administrator_entries_read_from_current_storage!==true||
    value.signer_possession_verified!==false||
    value.fee_collection_enabled!==false||value.payment_execution_enabled!==false||
    value.privacy_verified!==false||
    value.release_administrator!==RELEASE_ADMIN||
    typeof value.same_administrator_for_all_contracts!=="boolean"||
    typeof value.all_administrators_match_deployment!=="boolean"||
    !Array.isArray(value.contracts)||value.contracts.length!==FIXED.length)return false;
 const contracts:unknown[]=value.contracts;
 let same=true,unchanged=true,first:string|undefined;
 for(let i=0;i<FIXED.length;i++){
  const [name,id]=FIXED[i],entry=contracts[i];
  if(!object(entry)||entry.name!==name||entry.contract_id!==id||
     !canonicalG(entry.current_administrator)||
     !(entry.pending_administrator===null||canonicalG(entry.pending_administrator))||
     !(i===2?entry.paused===null:typeof entry.paused==="boolean")||
     (i===2&&entry.pending_administrator!==null)||
     typeof entry.matches_deployment_administrator!=="boolean"||
     entry.matches_deployment_administrator!==(entry.current_administrator===RELEASE_ADMIN))return false;
  unchanged=unchanged&&entry.matches_deployment_administrator;
  if(i===0)first=entry.current_administrator;
  else same=same&&first===entry.current_administrator;
 }
 return value.same_administrator_for_all_contracts===same&&
        value.all_administrators_match_deployment===unchanged;
}
