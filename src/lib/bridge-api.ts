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
