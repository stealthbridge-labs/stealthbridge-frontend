import {assertBusinessRouteIds,validCorridorBatch,type CorridorBatch} from "./business-batch.ts";

export type CorridorBatchPreflight={
 schema_version:1;network:"testnet";source:"live-batch-metadata-preflight";
 observed_at_unix:number;batch:CorridorBatch;network_fresh:boolean;
 ledger_sequence:number|null;database_schema_ready:boolean;
 read_only_dependencies_ready:boolean;payment_execution_enabled:false;
 fee_quote_available:false;liquidity_verified:false;issuer_verified:false;
 privacy_verified:false;fiat_payouts_enabled:false;
};
const keys=["schema_version","network","source","observed_at_unix","batch",
 "network_fresh","ledger_sequence","database_schema_ready","read_only_dependencies_ready",
 "payment_execution_enabled","fee_quote_available","liquidity_verified",
 "issuer_verified","privacy_verified","fiat_payouts_enabled"].sort().join(",");
/** Strictly validate fresh operational evidence; this is never settlement authorization. */
export function validCorridorBatchPreflight(
 value:unknown,ids:readonly string[],now=Math.floor(Date.now()/1000)
):value is CorridorBatchPreflight{
 try{assertBusinessRouteIds(ids);}catch{return false;}
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(",")!==keys||
  v.schema_version!==1||v.network!=="testnet"||
  v.source!=="live-batch-metadata-preflight"||
  typeof v.observed_at_unix!=="number"||
  !Number.isSafeInteger(v.observed_at_unix)||
  v.observed_at_unix<now-120||v.observed_at_unix>now+30||
  !validCorridorBatch(v.batch,ids)||
  typeof v.network_fresh!=="boolean"||
  typeof v.database_schema_ready!=="boolean"||
  v.read_only_dependencies_ready!==(v.network_fresh&&v.database_schema_ready)||
  ["payment_execution_enabled","fee_quote_available","liquidity_verified",
   "issuer_verified","privacy_verified","fiat_payouts_enabled"].some(key=>v[key]!==false))
  return false;
 return v.network_fresh?
  typeof v.ledger_sequence==="number"&&Number.isSafeInteger(v.ledger_sequence)&&
   v.ledger_sequence>0:v.ledger_sequence===null;
}
/** Prevent a corridor changing between independent live snapshots. */
export function matchingCorridorBatches(a:CorridorBatch,b:CorridorBatch):boolean{
 if(!validCorridorBatch(a,a.requested_ids)||
  !validCorridorBatch(b,a.requested_ids))return false;
 return a.items.length===b.items.length&&a.items.every((row,i)=>{
  const current=b.items[i];
  return current!==undefined&&row.id===current.id&&
    row.origin_country===current.origin_country&&
    row.destination_country===current.destination_country&&
    row.asset_code===current.asset_code&&
    row.asset_issuer===current.asset_issuer&&
    row.privacy_rail===current.privacy_rail;
 });
}

/** Browser-to-public-proxy: public UUIDs only, no cookie or payment details. */
export async function loadBusinessCorridorBatchPreflight(
 ids:readonly string[],signal?:AbortSignal
):Promise<CorridorBatchPreflight>{
 const validated=assertBusinessRouteIds(ids);
 const response=await fetch("/api/public/corridors/batch/preflight?ids="+validated.join(","),{
  method:"GET",cache:"no-store",credentials:"omit",signal
 });
 if(!response.ok)throw new Error("Live batch preflight is temporarily unavailable.");
 const value:unknown=await response.json();
 if(!validCorridorBatchPreflight(value,validated))
  throw new Error("Live batch preflight returned invalid or stale evidence.");
 return value;
}
