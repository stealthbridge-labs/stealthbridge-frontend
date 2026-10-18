import {validPlatformCatalog,type PlatformCatalog} from "./platform-modules";
import {assertActivityFilters,validateActivityPage} from "./observer-activity";
import type {ActivityFilters,PublicActivityPage} from "./observer-activity";
import canonicalSorobanInterface from "./public-soroban-interface.v1.json";
import {validGovernanceRelease,type GovernanceRelease} from "./governance-release";
import {validGovernanceCode,type GovernanceCodeObservation} from "./governance-code";
import {validGovernanceAdministrator,type GovernanceAdministratorObservation} from "./governance-administrator";
import {validGovernanceSnapshot,type GovernanceSnapshot} from "./governance-snapshot";
import type {
 ApiNetworkStatus,ApiCapabilities,ApiCorridor,ApiCorridorPage,
 ApiTransactionObservation,ApiLedgerCheckpoint,ApiReadiness,ApiContractDiscovery
} from "./sdk-api-wire.v0.2";

/** Source of truth: versioned SDK v0.2 generated backend OpenAPI snapshot.
 * These names are compatibility aliases for existing frontend components.
 * Every external response is still validated at runtime below.
 */
export interface NetworkStatus extends ApiNetworkStatus {}
export interface Capabilities extends ApiCapabilities {}
export type PrivacyRail=ApiCorridor["privacy_rail"];
export interface Corridor extends ApiCorridor {asset_issuer:string|null;}
export interface TransactionObservation extends ApiTransactionObservation {}
export class ApiUnavailable extends Error {
 constructor(public readonly status:number,public readonly endpoint:string,
  public readonly code:string|null=null,public readonly traceId:string|null=null){
  const summary=status===503?"The data service returned HTTP 503: dependency unavailable or unconfigured.":"The data service returned HTTP "+status+".";
  super(summary+(code?" Error code: "+code+".":"")+(traceId?" Request ID: "+traceId+".":""));this.name="ApiUnavailable";
 }
}
async function read<T>(path:string,signal?:AbortSignal):Promise<T>{
 const res=await fetch("/api/bridge/"+path,{cache:"no-store",signal});
 if(!res.ok){
  const rawCode=res.headers.get("x-error-code"),rawTraceId=res.headers.get("x-request-id");
  const code=rawCode&&/^[A-Z][A-Z0-9_]{0,63}$/.test(rawCode)?rawCode:null;
  const traceId=rawTraceId&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(rawTraceId)?rawTraceId:null;
  await res.body?.cancel().catch(()=>{});
  throw new ApiUnavailable(res.status,path,code,traceId);
 }
 return res.json() as Promise<T>;
}
function capabilitiesResponse(value:unknown):value is Capabilities{
 if(value===null||typeof value!=="object"||Array.isArray(value))return false;
 const flags=value as Record<string,unknown>;
 return ["payments_enabled","confidential_token_verified","private_payments_verified","fiat_payouts_enabled"]
  .every(key=>flags[key]===false);
}
function networkResponse(value:unknown):value is NetworkStatus {
 if(value===null||typeof value!=="object"||Array.isArray(value))return false;
 const n=value as Record<string,unknown>;
 return n.network==="testnet"&&n.source==="stellar-rpc"&&
  n.passphrase==="Test SDF Network ; September 2015"&&
  Number.isSafeInteger(n.protocol_version)&&Number(n.protocol_version)>0&&
  Number.isSafeInteger(n.ledger_sequence)&&Number(n.ledger_sequence)>0&&
  typeof n.ledger_closed_at_unix==="string"&&/^\d+$/.test(n.ledger_closed_at_unix)&&
  typeof n.ledger_hash==="string"&&/^[a-f0-9]{64}$/i.test(n.ledger_hash);
}
/** Runtime boundaries remain fail-closed even when TypeScript types compile. */
function checkpointResponse(value:unknown):value is ObservedLedgerCheckpoint {
 if(value===null||typeof value!=="object"||Array.isArray(value))return false;
 const entry=value as Record<string,unknown>;
 return Number.isSafeInteger(entry.ledger_sequence)&&Number(entry.ledger_sequence)>0&&
  typeof entry.ledger_hash==="string"&&/^[a-f0-9]{64}$/i.test(entry.ledger_hash)&&
  typeof entry.ledger_closed_at_unix==="string"&&/^\d{1,20}$/.test(entry.ledger_closed_at_unix)&&
  entry.source==="stellar-rpc";
}
function transactionResponse(value:unknown,expectedHash:string):value is TransactionObservation {
 if(value===null||typeof value!=="object"||Array.isArray(value))return false;
 const item=value as Record<string,unknown>;
 return typeof item.hash==="string"&&item.hash.toLowerCase()===expectedHash.toLowerCase()&&
  ["SUCCESS","FAILED"].includes(String(item.status))&&
  Number.isSafeInteger(item.ledger)&&Number(item.ledger)>0&&
  Number.isSafeInteger(item.latest_ledger)&&Number(item.latest_ledger)>=Number(item.ledger)&&
  typeof item.closed_at_unix==="string"&&/^\d{1,20}$/.test(item.closed_at_unix)&&
  item.source==="stellar-rpc";
}
function corridorsResponse(value:unknown):value is Corridor[] {
 return Array.isArray(value)&&value.length<=100&&value.every(row=>
  !!row&&typeof row==="object"&&
  typeof row.id==="string"&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(row.id)&&
  typeof row.origin_country==="string"&&/^[A-Z]{2}$/.test(row.origin_country)&&
  typeof row.destination_country==="string"&&/^[A-Z]{2}$/.test(row.destination_country)&&
  typeof row.asset_code==="string"&&/^[a-zA-Z0-9_:-]{1,64}$/.test(row.asset_code)&&
  (row.asset_issuer===null||(typeof row.asset_issuer==="string"&&
   row.asset_issuer.length>0&&row.asset_issuer.length<=128))&&
  ["confidential-token","private-payments"].includes(row.privacy_rail));
}
function readinessResponse(value:unknown):value is ServiceReadiness {
 if(value===null||typeof value!=="object"||Array.isArray(value))return false;
 const r=value as Record<string,unknown>;
 return (r.status==="ready"||r.status==="degraded")&&
  (r.stellar_rpc==="connected"||r.stellar_rpc==="unavailable")&&
  ["connected","unavailable","not-configured"].includes(String(r.database))&&
  r.payments==="disabled"&&
  (r.status!=="ready"||(r.stellar_rpc==="connected"&&r.database==="connected"));
}
/**
 * Source inventory is read-only metadata, not deployed-contract evidence.
 * Reject any contrary claim even if an upstream service becomes compromised.
 */
/** Compare JSON structures without treating object key order as a signature. */
function sameCanonicalJson(a:unknown,b:unknown):boolean {
 if(a===b)return true;
 if(a===null||b===null||typeof a!=="object"||typeof b!=="object")return false;
 if(Array.isArray(a)||Array.isArray(b)){
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
   a.every((value,index)=>sameCanonicalJson(value,b[index]));
 }
 const left=a as Record<string,unknown>,right=b as Record<string,unknown>;
 const keys=Object.keys(left);
 return keys.length===Object.keys(right).length &&
  keys.every(key=>Object.hasOwn(right,key)&&sameCanonicalJson(left[key],right[key]));
}
function contractDiscoveryResponse(value:unknown):value is ContractDiscovery{
 const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
 if(!obj(value)||value.network!=="testnet"||
    value.source!=="stealthbridge-contracts/deployments/testnet/manifest.json"||
    value.on_chain_verified!==false||value.payment_execution_enabled!==false)return false;
 const m=value.manifest,i=value.public_interface;
 if(!obj(m)||m.schemaVersion!==1||m.network!=="testnet"||
    m.status!=="not-deployed"||m.verified!==false||
    !obj(m.contractAddresses)||Object.keys(m.contractAddresses).length!==0||
    !obj(m.assetIssuers)||Object.keys(m.assetIssuers).length!==0||
    !Array.isArray(m.txHashes)||m.txHashes.length!==0)return false;
 // Compare every declared function, argument, return type and write method
 // against an audited source snapshot. No invented or partial ABI accepted.
 if(!sameCanonicalJson(i,canonicalSorobanInterface))return false;
 return true;
}
export async function readBridge<T>(endpoint:"network"|"corridors"|"capabilities"|"observer"|"contracts"|"ready",signal?:AbortSignal){
 const value=await read<unknown>((endpoint==="ready"?"":"v1/")+endpoint,signal);
 if(endpoint==="network"&&!networkResponse(value)){
  if(value!==null&&typeof value==="object"&&
     "passphrase" in value&&value.passphrase!=="Test SDF Network ; September 2015")
   throw new Error("The backend reported a different Stellar network. Testnet access was denied.");
  throw new Error("Network response was invalid or not Stellar Testnet.");
 }
 if(endpoint==="ready"&&!readinessResponse(value))
  throw new Error("Readiness response was invalid or claimed unsupported readiness.");
 if(endpoint==="contracts"&&!contractDiscoveryResponse(value))
  throw new Error("Contract discovery is unverified or incompatible. On-chain actions remain disabled.");
 if(endpoint==="capabilities"&&!capabilitiesResponse(value))
  throw new Error("Capabilities response was invalid. Payment controls remain disabled.");
 if(endpoint==="observer"&&!checkpointResponse(value))
  throw new Error("Observer checkpoint was invalid or did not originate from Stellar Testnet.");
 if(endpoint==="corridors"&&!corridorsResponse(value))
  throw new Error("Corridor API returned malformed or unsupported metadata.");
 return value as T;
}
export const validTransactionHash=(s:string)=>/^[a-f0-9]{64}$/i.test(s);
export function readTransaction(hash:string,signal?:AbortSignal):Promise<TransactionObservation>{
 if(!validTransactionHash(hash))throw new TypeError("Transaction hash must be 64 hexadecimal characters.");
 return read<unknown>("v1/transactions/"+hash.toLowerCase(),signal).then(value=>{
  if(!transactionResponse(value,hash))
   throw new Error("Public Testnet transaction observation did not match the requested hash or schema.");
  return value;
 });
}

/** The last persisted Testnet observer cursor, not necessarily the live ledger head. */
export interface ObservedLedgerCheckpoint extends ApiLedgerCheckpoint {}

/** Actual operator-enabled corridor keyset page; never a quote or payout list. */
export interface CorridorPage extends ApiCorridorPage {items:Corridor[];}
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
/** Exact metadata filters only; a matching corridor is not payment eligibility. */
export interface CorridorFilters {originCountry?:string;destinationCountry?:string;privacyRail?:PrivacyRail;}
export function readCorridorPage(after?:string,signal?:AbortSignal):Promise<CorridorPage>{
 return readFilteredCorridorPage({},after,signal);
}
export async function readFilteredCorridorPage(filters:CorridorFilters,after?:string,signal?:AbortSignal):Promise<CorridorPage>{
 if(after!==undefined&&!UUID.test(after))throw new TypeError("Invalid corridor cursor");
 if([filters.originCountry,filters.destinationCountry].some(v=>v!==undefined&&!/^[A-Z]{2}$/.test(v)))
  throw new TypeError("Countries must be exactly two uppercase letters.");
 if(filters.privacyRail!==undefined&&!["confidential-token","private-payments"].includes(filters.privacyRail))
  throw new TypeError("Unsupported privacy rail.");
 const params=new URLSearchParams({limit:"25"});
 if(filters.originCountry)params.set("origin_country",filters.originCountry);
 if(filters.destinationCountry)params.set("destination_country",filters.destinationCountry);
 if(filters.privacyRail)params.set("privacy_rail",filters.privacyRail);
 if(after)params.set("after",after.toLowerCase());
 const page=await read<CorridorPage>("v1/corridors/page?"+params,signal);
 if(!page||!Array.isArray(page.items)||page.items.length>25||
    page.items.some((c,index)=>!c||typeof c.id!=="string"||!UUID.test(c.id)||
      typeof c.origin_country!=="string"||!/^[A-Z]{2}$/.test(c.origin_country)||
      typeof c.destination_country!=="string"||!/^[A-Z]{2}$/.test(c.destination_country)||
      c.origin_country===c.destination_country||
      typeof c.asset_code!=="string"||!/^[a-zA-Z0-9_:-]{1,64}$/.test(c.asset_code)||
      (c.asset_issuer!==null&&(typeof c.asset_issuer!=="string"||
         c.asset_issuer.length===0||c.asset_issuer.length>128))||
      !["private-payments","confidential-token"].includes(c.privacy_rail)||
      (filters.originCountry!==undefined&&c.origin_country!==filters.originCountry)||
      (filters.destinationCountry!==undefined&&c.destination_country!==filters.destinationCountry)||
      (filters.privacyRail!==undefined&&c.privacy_rail!==filters.privacyRail)||
      (index>0&&page.items[index-1].id.toLowerCase()>=c.id.toLowerCase())||
      (after!==undefined&&c.id.toLowerCase()<=after.toLowerCase()))||
    !(page.next_cursor===null||(typeof page.next_cursor==="string"&&UUID.test(page.next_cursor)))||
    (page.next_cursor!==null&&(page.items.length===0||
      page.next_cursor.toLowerCase()!==page.items[page.items.length-1].id.toLowerCase())))
  throw new Error("Configured corridor API returned an invalid or out-of-order page.");
 return page;
}

/** Dependency readiness, not approval to move money. */
export interface ServiceReadiness extends ApiReadiness {}

/** Canonical, currently undeployed Testnet contract manifest as seen by backend. */
export interface ContractDiscovery extends ApiContractDiscovery {
 network:"testnet";
 source:"stealthbridge-contracts/deployments/testnet/manifest.json";
 on_chain_verified:false;
 payment_execution_enabled:false;
 public_interface:{
  schemaVersion:1;
  network:"testnet";
  status:"source-interface-only";
  contracts:Record<string,{source:string;reads:Record<string,{args:string[];returns:string}>;writes:string[]}>;
 };
 manifest:{
  schemaVersion:1;network:"testnet";status:"not-deployed";verified:false;
  contractAddresses:Record<string,never>;
  assetIssuers:Record<string,never>;
  txHashes:never[];
  notes?:string;
 };
}

/** Read-only platform discovery; invalid capability claims fail closed. */
export async function readPlatformModules(signal?:AbortSignal):Promise<PlatformCatalog>{
 const value=await read<unknown>("v1/platform/modules",signal);
 if(!validPlatformCatalog(value))throw new Error("Unverified platform capability inventory. Financial execution remains disabled.");
 return value;
}

/** Historical published release receipts, rechecked against live Testnet txs by the backend.
 * Not current WASM/admin verification and never payment authority.
 */
export async function readGovernanceRelease(signal?:AbortSignal):Promise<GovernanceRelease>{
 const value=await read<unknown>("v1/governance/release",signal);
 if(!validGovernanceRelease(value))throw new Error("Governance receipts invalid, stale or misrepresent financial capabilities.");
 return value;
}

/** Current contract-instance executable hashes and TTLs from read-only Testnet
 * getLedgerEntries, never a decoded current administrator, independent audit,
 * payment authorization, or full WASM byte-for-byte re-download.
 */
export async function readGovernanceCode(signal?:AbortSignal):Promise<GovernanceCodeObservation>{
 const value=await read<unknown>("v1/governance/code",signal);
 if(!validGovernanceCode(value))throw new Error("Current Testnet executable hash response was invalid or overstated safety.");
 return value;
}

/** Validated Soroban current admin values from signed-network public ledger
 * observations, never an assertion that we own or can sign for those addresses.
 */
export async function readGovernanceAdministrator(signal?:AbortSignal):Promise<GovernanceAdministratorObservation>{
 const value=await read<unknown>("v1/governance/admin",signal);
 if(!validGovernanceAdministrator(value))throw new Error("Current governance administrator response is invalid or overstates authority.");
 return value;
}

/** Display only bounded historical public Testnet contract-event metadata.
 * A journal record is never a verified privacy proof or fiat payout.
 */
export async function readObserverActivity(
 filters:ActivityFilters={},signal?:AbortSignal
):Promise<PublicActivityPage>{
 const limit=assertActivityFilters(filters);
 const params=new URLSearchParams({limit:String(limit)});
 if(filters.contractId)params.set("contract_id",filters.contractId);
 if(filters.before)params.set("before",filters.before);
 const value=await read<unknown>("v1/observer/activity?"+params,signal);
 if(!validateActivityPage(value,{...filters,limit}))
  throw new Error("Public Testnet journal was malformed, out of order or claimed unsupported execution.");
 return value;
}
export type {ActivityContract,ActivityEvent,PublicActivityPage,ActivityFilters} from "./observer-activity";

/** One bounded Testnet instance read plus separately verified deployment receipts. */
export async function readGovernanceSnapshot(signal?:AbortSignal):Promise<GovernanceSnapshot>{
 const value=await read<unknown>("v1/governance/snapshot",signal);
 if(!validGovernanceSnapshot(value))throw new Error("Invalid, stale or overstated same-ledger governance evidence.");
 return value;
}
