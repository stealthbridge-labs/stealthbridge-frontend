import {validGovernanceRelease, type GovernanceRelease} from "./governance-release";
import {validGovernanceCode, type GovernanceCodeObservation} from "./governance-code";
import {validGovernanceAdministrator, type GovernanceAdministratorObservation} from "./governance-administrator";

/**
 * Evidence consistency across three independent read-only endpoints.
 * This does NOT verify RPC origin, a canonical manifest signature, or live
 * authorizations. Never use this result to unlock a financial operation.
 */
export type GovernanceAssessment = Readonly<{
 state:"consistent-observations"|"unverified";
 reason:string;
 paymentsEnabled:false;
 feesEnabled:false;
 privacyVerified:false;
 trustedForExecution:false;
 observedLedger:number|null;
}>;

export function assessGovernanceObservations(
 release:unknown, code:unknown, administrators:unknown
):GovernanceAssessment {
 const denied=(reason:string):GovernanceAssessment=>({
  state:"unverified",reason,paymentsEnabled:false,feesEnabled:false,
  privacyVerified:false,trustedForExecution:false,observedLedger:null
 });
 if(!validGovernanceRelease(release) || !validGovernanceCode(code) ||
    !validGovernanceAdministrator(administrators))
  return denied("invalid or stale governance evidence");
 const r:GovernanceRelease=release;
 const c:GovernanceCodeObservation=code;
 const a:GovernanceAdministratorObservation=administrators;
 if(r.observed_ledger_sequence!==c.observed_ledger_sequence ||
    r.observed_ledger_sequence!==a.observed_ledger_sequence)
  return denied("governance observations belong to different ledgers");
 if(!c.all_executable_hashes_match_release ||
    !a.all_administrators_match_deployment ||
    !a.same_administrator_for_all_contracts)
  return denied("governance hashes or administrators have changed");
 if(a.contracts.some(entry=>entry.paused===true ||
    entry.pending_administrator!==null))
  return denied("governance paused or administrator rotation pending");
 const timeR=Number(r.observed_ledger_closed_at_unix);
 const timeA=Number(a.observed_ledger_closed_at_unix);
 if(!Number.isSafeInteger(timeR)||!Number.isSafeInteger(timeA)||
    Math.abs(timeR-timeA)>30)
  return denied("governance observation times disagree");
 for(let i=0;i<r.contracts.length;i++){
  const receipt=r.contracts[i], executable=c.contracts[i], admin=a.contracts[i];
  if(receipt.name!==executable.name||receipt.name!==admin.name||
     receipt.contract_id!==executable.contract_id||
     receipt.contract_id!==admin.contract_id||
     receipt.wasm_sha256_at_release!==executable.release_executable_wasm_hash)
   return denied("inconsistent contract identity across sources");
 }
 return {state:"consistent-observations",
  reason:"Read-only snapshots agree; independent manifest attestation still required",
  paymentsEnabled:false,feesEnabled:false,privacyVerified:false,
  trustedForExecution:false,observedLedger:r.observed_ledger_sequence};
}
