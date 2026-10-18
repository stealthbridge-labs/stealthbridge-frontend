/**
 * Public Testnet evidence assessment shared between the SDK and the web client.
 *
 * This file intentionally has no dependencies so that the frontend can pin the
 * exact reviewed SDK implementation. All evidence originates from five GETs.
 * No status here grants access to payment submission or private balances.
 */
export interface PublicNetworkEvidence {
 network:"testnet";passphrase:string;source:"stellar-rpc";
 ledger_sequence:number;ledger_closed_at_unix:string;ledger_hash:string;
}
export interface PersistedObserverEvidence {
 ledger_sequence:number;ledger_closed_at_unix:string;ledger_hash:string;source:"stellar-rpc";
}
export interface PublicReadinessEvidence {
 status:"ready"|"degraded";stellar_rpc:"connected"|"unavailable";
 database:"connected"|"unavailable"|"not-configured";payments:"disabled";
}
export interface PublicCapabilityEvidence {
 payments_enabled:boolean;confidential_token_verified:boolean;
 private_payments_verified:boolean;fiat_payouts_enabled:boolean;
}
export interface PublicContractEvidence {
 network:"testnet";on_chain_verified:boolean;payment_execution_enabled:boolean;
 manifest:{network:string;status:string;verified:boolean};
}
export interface PublicObservationInput {
 checkedAtUnix:number;
 network:PublicNetworkEvidence|null;
 observer:PersistedObserverEvidence|null;
 readiness:PublicReadinessEvidence|null;
 capabilities:PublicCapabilityEvidence|null;
 contracts:PublicContractEvidence|null;
}
export type ObserverComparison="aligned"|"lagging"|"stale"|"ahead"|"conflict"|"unavailable";
export type EvidenceVerdict="public-metadata-current"|"partial"|"inconsistent"|"unsupported-claim";
export interface PublicEvidenceAssessment {
 checkedAtUnix:number;
 liveLedger:number|null;
 observerLedger:number|null;
 ledgerGap:number|null;
 liveFresh:boolean;
 observerFresh:boolean;
 observerComparison:ObserverComparison;
 databaseReady:boolean;
 sourceOnly:boolean;
 financialFlagsDisabled:boolean;
 verdict:EvidenceVerdict;
 paymentExecutionEnabled:false;
}
export interface PublicEvidenceRecord {
 checkedAtUnix:number;
 liveLedger:number|null;
 observerLedger:number|null;
 ledgerGap:number|null;
 observerComparison:ObserverComparison;
 verdict:EvidenceVerdict;
}
const PASSPHRASE="Test SDF Network ; September 2015";
const HEX_64=/^[a-f\d]{64}$/i;
const MAX_AGE=180;
function validUnix(value:string,now:number):boolean {
 if(!/^\d{1,20}$/.test(value))return false;
 const time=Number(value);
 return Number.isSafeInteger(time)&&time>0&&now-time>=-30&&now-time<=MAX_AGE;
}
function validNetwork(value:PublicNetworkEvidence|null):value is PublicNetworkEvidence {
 return !!value&&value.network==="testnet"&&value.passphrase===PASSPHRASE&&
  value.source==="stellar-rpc"&&Number.isSafeInteger(value.ledger_sequence)&&
  value.ledger_sequence>0&&typeof value.ledger_closed_at_unix==="string"&&
  typeof value.ledger_hash==="string"&&HEX_64.test(value.ledger_hash);
}
function validObserver(value:PersistedObserverEvidence|null):value is PersistedObserverEvidence {
 return !!value&&value.source==="stellar-rpc"&&
  Number.isSafeInteger(value.ledger_sequence)&&value.ledger_sequence>0&&
  typeof value.ledger_closed_at_unix==="string"&&
  typeof value.ledger_hash==="string"&&HEX_64.test(value.ledger_hash);
}
/**
 * A matching ledger *number* but different hash is not a successful sync.
 * Equally, an ahead-of-RPC observer can never be called fresh or healthy.
 * A missing checkpoint must remain missing (no fake ledger-number fallback).
 */
export function assessPublicObservations(input:PublicObservationInput):PublicEvidenceAssessment {
 const now=input.checkedAtUnix;
 if(!Number.isSafeInteger(now)||now<=0)throw new RangeError("checkedAtUnix must be a positive Unix second");
 const network=validNetwork(input.network)?input.network:null;
 const observer=validObserver(input.observer)?input.observer:null;
 const liveFresh=!!network&&validUnix(network.ledger_closed_at_unix,now);
 const observerFresh=!!observer&&validUnix(observer.ledger_closed_at_unix,now);
 const liveLedger=network?.ledger_sequence??null;
 const observerLedger=observer?.ledger_sequence??null;
 const ledgerGap=network&&observer&&observer.ledger_sequence<=network.ledger_sequence?
  network.ledger_sequence-observer.ledger_sequence:null;
 let observerComparison:ObserverComparison="unavailable";
 if(network&&observer) {
  if(observer.ledger_sequence>network.ledger_sequence)observerComparison="ahead";
  else if(observer.ledger_sequence===network.ledger_sequence&&
    observer.ledger_hash.toLowerCase()!==network.ledger_hash.toLowerCase())
   observerComparison="conflict";
  else if(!liveFresh||!observerFresh)observerComparison="stale";
  else if(observer.ledger_sequence===network.ledger_sequence)observerComparison="aligned";
  else observerComparison="lagging";
 }
 const databaseReady=input.readiness?.status==="ready"&&
  input.readiness.database==="connected"&&input.readiness.stellar_rpc==="connected"&&
  input.readiness.payments==="disabled";
 const financialFlagsDisabled=!!input.capabilities&&
  input.capabilities.payments_enabled===false&&
  input.capabilities.confidential_token_verified===false&&
  input.capabilities.private_payments_verified===false&&
  input.capabilities.fiat_payouts_enabled===false;
 const sourceOnly=input.contracts?.network==="testnet"&&
  input.contracts.on_chain_verified===false&&
  input.contracts.payment_execution_enabled===false&&
  input.contracts.manifest?.network==="testnet"&&
  input.contracts.manifest.status==="not-deployed"&&
  input.contracts.manifest.verified===false;
 const unsafe=(input.capabilities!==null&&!financialFlagsDisabled)||
  (input.contracts!==null&&!sourceOnly);
 let verdict:EvidenceVerdict="partial";
 if(unsafe)verdict="unsupported-claim";
 else if(observerComparison==="ahead"||observerComparison==="conflict")verdict="inconsistent";
 else if(liveFresh&&databaseReady&&sourceOnly&&financialFlagsDisabled&&
  observerComparison==="aligned")verdict="public-metadata-current";
 return {
  checkedAtUnix:now,liveLedger,observerLedger,ledgerGap,liveFresh,observerFresh,
  observerComparison,databaseReady,sourceOnly,financialFlagsDisabled,
  verdict,paymentExecutionEnabled:false,
 };
}
/** Bounded, in-memory-only history; no keys, tokens, raw RPC body or identity. */
export function appendPublicEvidence(
 history:readonly PublicEvidenceRecord[],assessment:PublicEvidenceAssessment,
 maxEntries=12,
):PublicEvidenceRecord[] {
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>60)
  throw new RangeError("maxEntries must be between 1 and 60");
 if(!Number.isSafeInteger(assessment.checkedAtUnix)||assessment.checkedAtUnix<=0)
  throw new TypeError("Invalid checked-at timestamp");
 const record:PublicEvidenceRecord={
  checkedAtUnix:assessment.checkedAtUnix,liveLedger:assessment.liveLedger,
  observerLedger:assessment.observerLedger,ledgerGap:assessment.ledgerGap,
  observerComparison:assessment.observerComparison,verdict:assessment.verdict,
 };
 // The latest attempt wins when the user checks twice within one second.
 const bounded=history.filter(row=>row.checkedAtUnix<record.checkedAtUnix)
  .slice(-(maxEntries-1));
 return [...bounded,record];
}
/**
 * Safe to copy on explicit user action. Never serialize full API responses,
 * internal operator endpoints, JWTs, IPs, RPC provider URLs or wallet IDs.
 */
export function publicEvidenceReceipt(
 history:readonly PublicEvidenceRecord[],generatedAtUnix:number,
):{schemaVersion:1;network:"testnet";scope:"public-read-only";generatedAtUnix:number;
  paymentExecutionEnabled:false;observations:PublicEvidenceRecord[]} {
 if(!Number.isSafeInteger(generatedAtUnix)||generatedAtUnix<=0)
  throw new TypeError("Invalid receipt time");
 const observations=history.slice(-60).map(row=>({
  checkedAtUnix:row.checkedAtUnix,liveLedger:row.liveLedger,
  observerLedger:row.observerLedger,ledgerGap:row.ledgerGap,
  observerComparison:row.observerComparison,verdict:row.verdict,
 }));
 return {schemaVersion:1,network:"testnet",scope:"public-read-only",
  generatedAtUnix,paymentExecutionEnabled:false,observations};
}
