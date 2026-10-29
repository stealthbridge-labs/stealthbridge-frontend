import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validCorridorBatchPreflight,matchingCorridorBatches,
 loadBusinessCorridorBatchPreflight} from "../src/lib/business-batch-preflight.ts";
const id="11111111-2222-4333-8444-555555555555",now=1800000000;
const row={id,origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
const batch={schema_version:1,network:"testnet",source:"operator-corridor-batch",
 requested_ids:[id],items:[row],missing_ids:[],all_configured:true,
 payment_execution_enabled:false,privacy_verified:false,fiat_payouts_enabled:false};
const ready={schema_version:1,network:"testnet",source:"live-batch-metadata-preflight",
 observed_at_unix:now,batch,network_fresh:true,ledger_sequence:123,
 database_schema_ready:false,read_only_dependencies_ready:false,
 payment_execution_enabled:false,fee_quote_available:false,liquidity_verified:false,
 issuer_verified:false,privacy_verified:false,fiat_payouts_enabled:false};
test("client rejects stale, contradictory, malformed and forged batch readiness",()=>{
 assert.equal(validCorridorBatchPreflight(ready,[id],now),true);
 for(const bad of [
 {...ready,observed_at_unix:now-121},{...ready,network_fresh:false},
 {...ready,read_only_dependencies_ready:true},{...ready,payment_execution_enabled:true},
 {...ready,issuer_verified:true},{...ready,ledger_sequence:0},
 {...ready,batch:{...batch,all_configured:false}},{...ready,operator:"trusted"}])
  assert.equal(validCorridorBatchPreflight(bad,[id],now),false);
 assert.equal(validCorridorBatchPreflight({...ready,network_fresh:false,ledger_sequence:null},[id],now),true);
 assert.equal(matchingCorridorBatches(batch,structuredClone(batch)),true);
 assert.equal(matchingCorridorBatches(batch,{...batch,items:[{...row,asset_code:"EURC"}]}),false);
});
test("GET proxy sends only IDs, not private draft data",async()=>{
 const real=globalThis.fetch;let target="",method="";
 try{
  globalThis.fetch=async (url,options)=>{
   target=String(url);method=options.method;
   return new Response(JSON.stringify({...ready,
    observed_at_unix:Math.floor(Date.now()/1000)}));
  };
  const result=await loadBusinessCorridorBatchPreflight([id]);
  assert.equal(result.database_schema_ready,false);
  assert.equal(target,"/api/public/corridors/batch/preflight?ids="+id);
  assert.equal(method,"GET");
 }finally{globalThis.fetch=real;}
});
test("business review requires two matching live reads and a local file import",async()=>{
 const component=await readFile("src/components/business-batch-planner.tsx","utf8");
 const proxy=await readFile("src/app/api/public/corridors/batch/preflight/route.ts","utf8");
 assert.match(component,/matchingCorridorBatches\(verified,live\.batch\)/);
 assert.match(component,/file\.text\(\)/);
 assert.doesNotMatch(component,/FileReader\.readAsDataURL|localStorage|sessionStorage/);
 assert.match(proxy,/validCorridorBatchPreflight/);
 assert.doesNotMatch(proxy,/export async function POST/);
});
