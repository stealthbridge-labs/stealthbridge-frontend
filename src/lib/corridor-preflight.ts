import {validCustomerCorridorPage,type CustomerCorridor} from "./customer-corridors.ts";

/** Exact read-only Testnet corridor metadata + independent dependency state. */
export type CustomerCorridorPreflight={
 schema_version:1;
 network:"testnet";
 source:"live-corridor-metadata-preflight";
 observed_at_unix:number;
 corridor:CustomerCorridor;
 network_fresh:boolean;
 ledger_sequence:number|null;
 database_schema_ready:boolean;
 read_only_dependencies_ready:boolean;
 payment_execution_enabled:false;
 fee_quote_available:false;
 liquidity_verified:false;
 issuer_verified:false;
 privacy_verified:false;
 fiat_payouts_enabled:false;
};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fields=["schema_version","network","source","observed_at_unix","corridor",
 "network_fresh","ledger_sequence","database_schema_ready","read_only_dependencies_ready",
 "payment_execution_enabled","fee_quote_available","liquidity_verified",
 "issuer_verified","privacy_verified","fiat_payouts_enabled"].sort().join(",");
export function validCustomerCorridorPreflight(
 data:unknown,id:string,now=Math.floor(Date.now()/1000)
):data is CustomerCorridorPreflight{
 if(!UUID.test(id)||!data||typeof data!=="object"||Array.isArray(data))return false;
 const v=data as Record<string,unknown>;
 if(Object.keys(v).sort().join(",")!==fields||
   v.schema_version!==1||v.network!=="testnet"||
   v.source!=="live-corridor-metadata-preflight"||
   typeof v.observed_at_unix!=="number"||!Number.isSafeInteger(v.observed_at_unix)||
   v.observed_at_unix>now+30||v.observed_at_unix<now-120||
   !validCustomerCorridorPage({items:[v.corridor],next_cursor:null})||
   (v.corridor as CustomerCorridor).id.toLowerCase()!==id.toLowerCase()||
   typeof v.network_fresh!=="boolean"||
   typeof v.database_schema_ready!=="boolean"||
   v.read_only_dependencies_ready!==(v.network_fresh&&v.database_schema_ready)||
   ["payment_execution_enabled","fee_quote_available","liquidity_verified",
    "issuer_verified","privacy_verified","fiat_payouts_enabled"].some(k=>v[k]!==false))
  return false;
 return v.network_fresh?
  typeof v.ledger_sequence==="number"&&Number.isSafeInteger(v.ledger_sequence)&&v.ledger_sequence>0:
  v.ledger_sequence===null;
}
export async function loadCustomerCorridorPreflight(
 id:string,signal?:AbortSignal
):Promise<CustomerCorridorPreflight>{
 if(!UUID.test(id))throw new TypeError("Invalid corridor ID");
 const response=await fetch("/api/public/corridors/"+id.toLowerCase()+"/preflight",{
  method:"GET",cache:"no-store",credentials:"omit",signal
 });
 if(!response.ok)throw new Error("Live route preflight is unavailable. Nothing has been sent.");
 const data:unknown=await response.json();
 if(!validCustomerCorridorPreflight(data,id))
  throw new Error("Route preflight returned stale or unverified evidence.");
 return data;
}
