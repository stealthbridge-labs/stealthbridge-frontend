export interface NetworkStatus {network:"testnet";passphrase:string;protocol_version:number;ledger_sequence:number;ledger_closed_at_unix:string;ledger_hash:string;source:"stellar-rpc";}
export interface Capabilities {payments_enabled:boolean;confidential_token_verified:boolean;private_payments_verified:boolean;fiat_payouts_enabled:boolean;}
export type PrivacyRail="confidential-token"|"private-payments";
export interface Corridor {id:string;origin_country:string;destination_country:string;asset_code:string;asset_issuer:string|null;privacy_rail:PrivacyRail;}
export interface TransactionObservation {hash:string;status:"SUCCESS"|"FAILED";ledger:number;closed_at_unix:string;latest_ledger:number;source:"stellar-rpc";}
export class ApiUnavailable extends Error {
 constructor(public readonly status:number,public readonly endpoint:string){
  super(status===503?"The data service is not configured or available.":"The data service returned HTTP "+status+".");this.name="ApiUnavailable";
 }
}
async function read<T>(path:string,signal?:AbortSignal):Promise<T>{
 const res=await fetch("/api/bridge/"+path,{cache:"no-store",signal});
 if(!res.ok)throw new ApiUnavailable(res.status,path);
 return res.json() as Promise<T>;
}
export function readBridge<T>(endpoint:"network"|"corridors"|"capabilities"|"observer"|"contracts"|"ready",signal?:AbortSignal){return read<T>((endpoint==="ready"?"":"v1/")+endpoint,signal);}
export const validTransactionHash=(s:string)=>/^[a-f0-9]{64}$/i.test(s);
export function readTransaction(hash:string,signal?:AbortSignal):Promise<TransactionObservation>{
 if(!validTransactionHash(hash))throw new TypeError("Transaction hash must be 64 hexadecimal characters.");
 return read<TransactionObservation>("v1/transactions/"+hash.toLowerCase(),signal);
}

/** The last persisted Testnet observer cursor, not necessarily the live ledger head. */
export interface ObservedLedgerCheckpoint {
 ledger_sequence:number;ledger_hash:string;ledger_closed_at_unix:string;source:"stellar-rpc";
}

/** Actual operator-enabled corridor keyset page; never a quote or payout list. */
export interface CorridorPage {items:Corridor[];next_cursor:string|null;}
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export async function readCorridorPage(after?:string,signal?:AbortSignal):Promise<CorridorPage>{
 if(after!==undefined&&!UUID.test(after))throw new TypeError("Invalid corridor cursor");
 const params=new URLSearchParams({limit:"25"});
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
      (index>0&&page.items[index-1].id.toLowerCase()>=c.id.toLowerCase())||
      (after!==undefined&&c.id.toLowerCase()<=after.toLowerCase()))||
    !(page.next_cursor===null||(typeof page.next_cursor==="string"&&UUID.test(page.next_cursor)))||
    (page.next_cursor!==null&&(page.items.length===0||
      page.next_cursor.toLowerCase()!==page.items[page.items.length-1].id.toLowerCase())))
  throw new Error("Configured corridor API returned an invalid or out-of-order page.");
 return page;
}

/** Dependency readiness, not approval to move money. */
export interface ServiceReadiness {
 status:"ready"|"degraded";stellar_rpc:"connected"|"unavailable";database:"connected"|"unavailable";payments:"disabled";
}

/** Canonical, currently undeployed Testnet contract manifest as seen by backend. */
export interface ContractDiscovery {
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
