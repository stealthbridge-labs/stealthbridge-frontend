/** Untrusted registry-upgrade review data. No RPC, wallet or signing occurs here.
 * Executability is exclusively decided on-chain with Soroban authorization.
 */
export type UpgradeableRegistry="corridor-registry"|"policy-registry";
export type UpgradeWindowState=
 "invalid"|"not-proposed"|"waiting"|"window-open-unverified"|"expired";
export interface PublicUpgradeProposal {
 wasm_hash:string;
 ready_at_ledger:number;
 expires_at_ledger:number;
}
export interface RegistryUpgradeObservation {
 network:"testnet";
 registry:UpgradeableRegistry;
 currentLedger:number;
 paused:boolean;
 candidateWasmSha256:string;
 pending:PublicUpgradeProposal|null;
}
export interface RegistryUpgradeAssessment {
 state:UpgradeWindowState;
 hashMatches:boolean;
 /** Never infer permission to change a contract from a public RPC observation. */
 authorizedToExecute:false;
 manualSigningRequired:true;
 financialExecutionEnabled:false;
 details:string;
}
const HASH=/^[0-9a-f]{64}$/;
function positive(v:unknown):v is number {
 return typeof v==="number"&&Number.isSafeInteger(v)&&v>0&&v<=4_294_967_295;
}
/** Succeeds only as public-state interpretation; independent RPC and signer checks remain required. */
export function assessRegistryUpgrade(value:RegistryUpgradeObservation):RegistryUpgradeAssessment{
 const unsafe=(details:string):RegistryUpgradeAssessment=>({
  state:"invalid",hashMatches:false,authorizedToExecute:false,
  manualSigningRequired:true,financialExecutionEnabled:false,details,
 });
 const base=(state:UpgradeWindowState,match:boolean,details:string):RegistryUpgradeAssessment=>({
  state,hashMatches:match,authorizedToExecute:false,
  manualSigningRequired:true,financialExecutionEnabled:false,details,
 });
 if(!value||value.network!=="testnet"||
   !["corridor-registry","policy-registry"].includes(value.registry)||
   typeof value.paused!=="boolean"||!positive(value.currentLedger)||
   !HASH.test(value.candidateWasmSha256)||
   value.candidateWasmSha256==="0".repeat(64))
   return unsafe("Untrusted network, contract type, candidate hash or ledger observation");
 if(value.pending===null)return base("not-proposed",false,"No on-chain upgrade proposal supplied");
 const p=value.pending;
 if(!p||!HASH.test(p.wasm_hash)||p.wasm_hash==="0".repeat(64)||
   !positive(p.ready_at_ledger)||!positive(p.expires_at_ledger)||
   p.expires_at_ledger-p.ready_at_ledger!==10_000)
   return unsafe("Malformed or unsupported upgrade proposal");
 const same=p.wasm_hash===value.candidateWasmSha256;
 if(!same)return unsafe("Proposed executable does not match independently reviewed candidate hash");
 if(!value.paused)return base("waiting",true,"Registry is not paused; execution must fail closed");
 if(value.currentLedger<p.ready_at_ledger)return base("waiting",true,"On-chain proposal timelock has not elapsed");
 if(value.currentLedger>p.expires_at_ledger)return base("expired",true,"On-chain proposal validity window has expired");
 return base("window-open-unverified",true,
  "Only the ledger window appears open; separately confirm deployed code, upload and administrator signature");
}
