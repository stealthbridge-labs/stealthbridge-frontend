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
export function readBridge<T>(endpoint:"network"|"corridors"|"capabilities"|"observer",signal?:AbortSignal){return read<T>("v1/"+endpoint,signal);}
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
    page.items.some(c=>!c||typeof c.id!=="string"||!UUID.test(c.id)||
      typeof c.origin_country!=="string"||typeof c.destination_country!=="string"||
      !["private-payments","confidential-token"].includes(c.privacy_rail))||
    !(page.next_cursor===null||(typeof page.next_cursor==="string"&&UUID.test(page.next_cursor))))
  throw new Error("Configured corridor API returned an invalid page.");
 return page;
}
