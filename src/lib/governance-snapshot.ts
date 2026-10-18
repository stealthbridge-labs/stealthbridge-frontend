import {validGovernanceRelease,type GovernanceRelease} from "./governance-release";
import {validGovernanceCode,type GovernanceCodeObservation} from "./governance-code";
import {validGovernanceAdministrator,type GovernanceAdministratorObservation} from "./governance-administrator";
import {assessGovernanceObservations} from "./governance-assessment";

/** One bounded, same-entry-ledger observation from the Rust API.
 * This is NOT a signed manifest, a proof of wallet custody, or payment authority.
 */
export interface GovernanceSnapshot {
 schema_version:1;
 network:"testnet";
 source:"stellar-rpc+stellar-horizon";
 state:"consistent-observations"|"unverified";
 reason:string;
 observed_ledger_sequence:number;
 observed_network_head_closed_at_unix:string;
 release:GovernanceRelease;
 code:GovernanceCodeObservation;
 administrators:GovernanceAdministratorObservation;
 canonical_manifest_attested:false;
 signer_possession_verified:false;
 trusted_for_execution:false;
 privacy_verified:false;
 payment_execution_enabled:false;
 fee_collection_enabled:false;
}
function obj(v:unknown):v is Record<string,unknown>{
 return v!==null&&typeof v==="object"&&!Array.isArray(v);
}
/** Reject forged flags, mismatched ledgers, stale data and conflicting claims.
 * "consistent-observations" is never safe to use to unlock financial execution.
 */
export function validGovernanceSnapshot(value:unknown):value is GovernanceSnapshot{
 if(!obj(value)||value.schema_version!==1||value.network!=="testnet"||
    value.source!=="stellar-rpc+stellar-horizon"||
    !Number.isSafeInteger(value.observed_ledger_sequence)||
    Number(value.observed_ledger_sequence)<5244293||
    typeof value.reason!=="string"||value.reason.length<1||value.reason.length>220||
    typeof value.observed_network_head_closed_at_unix!=="string"||
    !/^[0-9]{1,20}$/.test(value.observed_network_head_closed_at_unix)||
    value.canonical_manifest_attested!==false||
    value.signer_possession_verified!==false||
    value.trusted_for_execution!==false||
    value.privacy_verified!==false||
    value.payment_execution_enabled!==false||
    value.fee_collection_enabled!==false||
    !validGovernanceRelease(value.release)||
    !validGovernanceCode(value.code)||
    !validGovernanceAdministrator(value.administrators))return false;
 const r=value.release,c=value.code,a=value.administrators;
 if(value.observed_ledger_sequence!==r.observed_ledger_sequence||
    value.observed_ledger_sequence!==c.observed_ledger_sequence||
    value.observed_ledger_sequence!==a.observed_ledger_sequence||
    value.observed_network_head_closed_at_unix!==r.observed_ledger_closed_at_unix||
    value.observed_network_head_closed_at_unix!==a.observed_ledger_closed_at_unix)return false;
 const head=Number(value.observed_network_head_closed_at_unix);
 const age=Math.floor(Date.now()/1000)-head;
 if(!Number.isSafeInteger(head)||head<=0||age>180||age< -30)return false;
 const assessment=assessGovernanceObservations(r,c,a);
 const state=assessment.state;
 if(value.state!==state)return false;
 return value.reason===(state==="consistent-observations"
   ?"Public same-ledger observations agree; canonical release not attested"
   :"Code, public administrator or deployment receipt observations disagree");
}
