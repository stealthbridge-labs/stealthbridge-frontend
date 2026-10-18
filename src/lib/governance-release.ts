/** Strict read-only validation of a REAL, pinned public Testnet governance release.
 * Deployment transactions are checked by the backend; this is NOT a live WASM
 * check, a payment capability, privacy assurance, or permission to sign.
 */
export interface GovernanceContractReceipt {
 name:"corridor-registry"|"policy-registry"|"governance-gate";
 contract_id:string;
 wasm_sha256_at_release:string;
 deployment_tx:string;
 deployment_ledger:number;
 deployment_transaction_confirmed:true;
}
export interface GovernanceRelease {
 schema_version:1;
 network:"testnet";
 source:"stealthbridge-contracts/deployments/testnet/governance-deployment-evidence.v2.json";
 release_date:"2026-10-17";
 administrator_at_release:string;
 observed_ledger_sequence:number;
 observed_ledger_closed_at_unix:string;
 contracts:GovernanceContractReceipt[];
 deployment_transactions_confirmed:true;
 onchain_code_freshly_verified:false;
 administrator_freshly_verified:false;
 privacy_verified:false;
 payment_execution_enabled:false;
 fee_collection_enabled:false;
}
const RELEASE=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB","588d17f99850272f2f18e6ee407d94329b4f8ae415c2f6b71993cf59f4139099","0ac4094247fd50872d079c9637b0975f825f99574e6722c9c69739d8c5c143e5",5244269],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5","856186ba3dca1feff010c670bd1ae9818bf69e284304273f943745603b9a7912","34c2e84cad5be5181b7e1964d4e48e2c26ca021583373922f821c0038abce118",5244283],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV","66b40fe5ee4f704a91acf39922ed130cc1eb4fc0cdc3c5ee5a30614921f4aa81","9468801411a6bbb7fb2966c0225057bb4f3c8a7113aa687c0a0be744a7c5b341",5244293]
] as const;
const ADMIN="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const SOURCE="stealthbridge-contracts/deployments/testnet/governance-deployment-evidence.v2.json";
function object(v:unknown):v is Record<string,unknown>{
 return v!==null&&typeof v==="object"&&!Array.isArray(v);
}
export function validGovernanceRelease(value:unknown,nowUnix=Math.floor(Date.now()/1000)):value is GovernanceRelease {
 if(!object(value)||value.schema_version!==1||value.network!=="testnet"||
    value.source!==SOURCE||value.release_date!=="2026-10-17"||
    value.administrator_at_release!==ADMIN||
    value.deployment_transactions_confirmed!==true||
    value.onchain_code_freshly_verified!==false||
    value.administrator_freshly_verified!==false||
    value.privacy_verified!==false||value.payment_execution_enabled!==false||
    value.fee_collection_enabled!==false||
    !Number.isSafeInteger(value.observed_ledger_sequence)||Number(value.observed_ledger_sequence)<5244293||
    typeof value.observed_ledger_closed_at_unix!=="string"||
    !/^[0-9]{1,20}$/.test(value.observed_ledger_closed_at_unix)||
    !Number.isSafeInteger(nowUnix)||nowUnix<=0||!Array.isArray(value.contracts)||
    value.contracts.length!==RELEASE.length)return false;
 const closed=Number(value.observed_ledger_closed_at_unix);
 if(!Number.isSafeInteger(closed)||nowUnix-closed>180||nowUnix-closed< -30)return false;
 const contracts:unknown=value.contracts;
 if(!Array.isArray(contracts))return false;
 return RELEASE.every(([name,id,wasm,tx,ledger],i)=>{
  const entry:unknown=contracts[i];
  return object(entry)&&entry.name===name&&entry.contract_id===id&&
   entry.wasm_sha256_at_release===wasm&&entry.deployment_tx===tx&&
   entry.deployment_ledger===ledger&&entry.deployment_transaction_confirmed===true;
 });
}
