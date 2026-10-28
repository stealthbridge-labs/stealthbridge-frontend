import {canonicalStellarAccountAddress} from "./stellar-address.ts";
import type {CustomerCorridor} from "./customer-corridors.ts";
export type BusinessBatchRow={
 corridor_id:string;recipient:string;amount:string;reference:string;
};
export type BusinessBatchDraft={rows:BusinessBatchRow[];routeIds:string[]};
export type CorridorBatch={
 schema_version:1;network:"testnet";source:"operator-corridor-batch";
 requested_ids:string[];items:CustomerCorridor[];missing_ids:string[];all_configured:boolean;
 payment_execution_enabled:false;privacy_verified:false;fiat_payouts_enabled:false;
};
export type BusinessBatchAssessment={
 totalRows:number;configuredRows:number;unconfiguredRows:number;
 missingRouteIds:string[];financialExecutionAuthorized:false;
 reviewOnly:true;
};
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const exact=(value:Record<string,unknown>,keys:string[])=>
 Object.keys(value).sort().join(",")===keys.slice().sort().join(",");
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
export function assertBusinessRouteIds(ids:readonly string[]):string[]{
 if(!Array.isArray(ids)||ids.length<1||ids.length>8||
  ids.some(id=>typeof id!=="string"||!uuid.test(id))||
  new Set(ids).size!==ids.length)
  throw new TypeError("Expected 1–8 distinct canonical corridor UUIDs.");
 return [...ids];
}
/** RFC4180 single-line CSV fields. Multiline cells and unclosed quotes are denied. */
function readFields(line:string):string[]{
 const cells:string[]=[];
 let value="",quoted=false,closed=false,atStart=true;
 for(let i=0;i<line.length;i++){
  const c=line[i]!;
  if(c==='"'){
   if(quoted&&line[i+1]==='"'){value+='"';i++;continue;}
   if(quoted){quoted=false;closed=true;continue;}
   if(atStart&&!closed){quoted=true;atStart=false;continue;}
   throw new TypeError("Malformed CSV quotes.");
  }
  if(!quoted&&c===","){cells.push(value);value="";closed=false;atStart=true;continue;}
  if(!quoted&&closed)throw new TypeError("Unexpected characters after a quote.");
  if(c==="\n"||c==="\r"||c==="\0")throw new TypeError("Unsupported CSV control character.");
  value+=c;atStart=false;
 }
 if(quoted)throw new TypeError("Unclosed CSV quote.");
 cells.push(value);
 return cells;
}
/** Sensitive recipients/amounts stay in caller memory; no network, storage or files. */
export function parseBusinessBatchCsv(input:string):BusinessBatchDraft{
 if(typeof input!=="string"||input.length<1||input.length>32768||input.includes("\0"))
  throw new TypeError("CSV must be between 1 and 32,768 characters.");
 const normalized=input.replace(/\r\n/g,"\n");
 if(normalized.includes("\r"))throw new TypeError("Use consistent CSV line endings.");
 const lines=normalized.endsWith("\n")?normalized.slice(0,-1).split("\n"):normalized.split("\n");
 if(lines.length<2||lines.length>51||lines.some(line=>line.length>4096))
  throw new TypeError("Expected a header and 1–50 payment drafts.");
 const header=readFields(lines[0]!);
 if(header.join(",")!=="corridor_id,recipient,amount,reference")
  throw new TypeError("Expected corridor_id,recipient,amount,reference header.");
 const ids:string[]=[];const rows:BusinessBatchRow[]=[];
 const references=new Set<string>();
 for(let i=1;i<lines.length;i++){
  const parts=readFields(lines[i]!);
  if(parts.length!==4)throw new TypeError("Invalid column count at CSV row "+(i+1));
  const [corridor_id,recipient,amount,reference]=parts as [string,string,string,string];
  if(!uuid.test(corridor_id))throw new TypeError("Invalid corridor ID at row "+(i+1));
  if(canonicalStellarAccountAddress(recipient)!==recipient)
   throw new TypeError("Invalid recipient account at row "+(i+1));
  // Decimal-string display precision only; actual asset decimals must be verified separately.
  if(!/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/.test(amount)||
     !/[1-9]/.test(amount))throw new TypeError("Invalid amount at row "+(i+1));
  if(!/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,63}$/.test(reference))
   throw new TypeError("Invalid reference at row "+(i+1));
  const key=reference.toLowerCase();
  if(references.has(key))throw new TypeError("Duplicate reference at row "+(i+1));
  references.add(key);
  if(!ids.includes(corridor_id))ids.push(corridor_id);
  if(ids.length>8)throw new TypeError("Batch exceeds eight unique public corridors.");
  rows.push({corridor_id,recipient,amount,reference});
 }
 return {rows,routeIds:ids};
}
function validCorridor(value:unknown):value is CustomerCorridor{
 if(!object(value)||!exact(value,["id","origin_country","destination_country",
 "asset_code","asset_issuer","privacy_rail"]))return false;
 return typeof value.id==="string"&&uuid.test(value.id)&&
  typeof value.origin_country==="string"&&/^[A-Z]{2}$/.test(value.origin_country)&&
  typeof value.destination_country==="string"&&/^[A-Z]{2}$/.test(value.destination_country)&&
  value.origin_country!==value.destination_country&&
  typeof value.asset_code==="string"&&/^[A-Za-z0-9_:-]{1,64}$/.test(value.asset_code)&&
  (value.asset_issuer===null||
   typeof value.asset_issuer==="string"&&value.asset_issuer.length>0&&value.asset_issuer.length<=128)&&
  (value.privacy_rail==="confidential-token"||value.privacy_rail==="private-payments");
}
/** Strictly partition requested IDs, no duplicates, extra fields or positive finance claims. */
export function validCorridorBatch(value:unknown,ids:readonly string[]):value is CorridorBatch{
 try{assertBusinessRouteIds(ids);}catch{return false;}
 if(!object(value)||!exact(value,["schema_version","network","source","requested_ids",
  "items","missing_ids","all_configured","payment_execution_enabled",
  "privacy_verified","fiat_payouts_enabled"])||
  value.schema_version!==1||value.network!=="testnet"||
  value.source!=="operator-corridor-batch"||
  value.payment_execution_enabled!==false||value.privacy_verified!==false||
  value.fiat_payouts_enabled!==false||
  !Array.isArray(value.requested_ids)||value.requested_ids.length!==ids.length||
  value.requested_ids.some((id,i)=>id!==ids[i])||
  !Array.isArray(value.items)||!Array.isArray(value.missing_ids))return false;
 const included=new Set<string>(),missing=new Set<string>();
 for(const row of value.items){if(!validCorridor(row)||included.has(row.id)||!ids.includes(row.id))return false;included.add(row.id);}
 for(const item of value.missing_ids){if(typeof item!=="string"||!uuid.test(item)||
   missing.has(item)||included.has(item)||!ids.includes(item))return false;missing.add(item);}
 if(ids.some(id=>!included.has(id)&&!missing.has(id))||
  value.all_configured!==(missing.size===0))return false;
 const sortedRows=ids.filter(id=>included.has(id)),actual=value.items.map((r:CustomerCorridor)=>r.id);
 return sortedRows.every((id,i)=>id===actual[i])&&
  ids.filter(id=>missing.has(id)).every((id,i)=>id===(value.missing_ids as string[])[i]);
}
export function assessBusinessBatch(draft:BusinessBatchDraft,coverage:CorridorBatch):BusinessBatchAssessment{
 if(!draft||!Array.isArray(draft.rows)||draft.rows.length<1||draft.rows.length>50||
    !validCorridorBatch(coverage,draft.routeIds)||
    draft.rows.some(row=>!draft.routeIds.includes(row.corridor_id)))
  throw new TypeError("Batch coverage cannot be verified.");
 const available=new Set(coverage.items.map(item=>item.id));
 const configuredRows=draft.rows.filter(row=>available.has(row.corridor_id)).length;
 return {totalRows:draft.rows.length,configuredRows,
  unconfiguredRows:draft.rows.length-configuredRows,
  missingRouteIds:[...coverage.missing_ids],
  financialExecutionAuthorized:false,reviewOnly:true};
}

/** Same-origin GET sends ONLY the bounded public IDs. Never send CSV or row fields. */
export async function loadBusinessCorridorBatch(ids:readonly string[],signal?:AbortSignal):Promise<CorridorBatch>{
 const checked=assertBusinessRouteIds(ids);
 const response=await fetch("/api/public/corridors/batch?ids="+checked.join(","),{
  method:"GET",cache:"no-store",credentials:"omit",signal
 });
 if(!response.ok)throw new Error("The public corridor batch is unavailable.");
 const value:unknown=await response.json();
 if(!validCorridorBatch(value,checked))throw new Error("The public corridor batch could not be verified.");
 return value;
}
