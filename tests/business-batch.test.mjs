import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {parseBusinessBatchCsv,assertBusinessRouteIds,validCorridorBatch,
 assessBusinessBatch,loadBusinessCorridorBatch} from "../src/lib/business-batch.ts";
const first="11111111-2222-4333-8444-555555555555";
const second="99999999-aaaa-4aaa-8aaa-bbbbbbbbbbbb";
const address="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const source="corridor_id,recipient,amount,reference\n"+
 first+","+address+",100.50,INVOICE-2026\n"+
 second+","+address+",2.75,INVOICE-2027";
const item={id:first,origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
const record={schema_version:1,network:"testnet",source:"operator-corridor-batch",
 requested_ids:[first,second],items:[item],missing_ids:[second],all_configured:false,
 payment_execution_enabled:false,privacy_verified:false,fiat_payouts_enabled:false};
test("browser-only enterprise CSV validates exact columns, amount and IDs",()=>{
 const rows=parseBusinessBatchCsv(source);
 assert.equal(rows.rows.length,2);assert.deepEqual(rows.routeIds,[first,second]);
 for(const bad of [
  source.replace("INVOICE-2027","INVOICE-2026"),
  source.replace("100.50","1e6"),source.replace("100.50","0"),
  source.replace("INVOICE-2026","=DANGEROUS"),
  source.replace(address,"GMALFORMEDADDRESS"),
  source.replace(second,second.toUpperCase()),
  source+"\n".repeat(52),
 ])assert.throws(()=>parseBusinessBatchCsv(bad),TypeError);
 assert.throws(()=>assertBusinessRouteIds([first,first]),TypeError);
 assert.throws(()=>assertBusinessRouteIds([second.toUpperCase()]),TypeError);
});
test("full batch coverage cannot turn into financial authority",()=>{
 assert.equal(validCorridorBatch(record,[first,second]),true);
 assert.deepEqual(assessBusinessBatch(parseBusinessBatchCsv(source),record),{
  totalRows:2,configuredRows:1,unconfiguredRows:1,missingRouteIds:[second],
  financialExecutionAuthorized:false,reviewOnly:true});
 for(const bad of [
  {...record,payment_execution_enabled:true},
  {...record,privacy_verified:true},
  {...record,fiat_payouts_enabled:true},
  {...record,all_configured:true},
  {...record,requested_ids:[second,first]},
  {...record,items:[{...item,quote:"fake"}]},
  {...record,missing_ids:[]},
  {...record,origin:"faked"}
 ])assert.equal(validCorridorBatch(bad,[first,second]),false);
});
test("browser calls only the public metadata endpoint, never sends CSV content",async()=>{
 const original=globalThis.fetch;let called="",opts;
 try{
  globalThis.fetch=async(url,options)=>{
   called=String(url);opts=options;
   return new Response(JSON.stringify(record),{status:200,headers:{"content-type":"application/json"}});
  };
  assert.equal((await loadBusinessCorridorBatch([first,second])).items[0].id,first);
  assert.equal(called,"/api/public/corridors/batch?ids="+first+","+second);
  assert.equal(opts.method,"GET");assert.equal(opts.credentials,"omit");
  assert.doesNotMatch(called,/INVOICE|100\.50|GAAACAQDAQ/);
 }finally{globalThis.fetch=original;}
});
test("authenticated business UI has no payment submit or persistence path",async()=>{
 const component=await readFile("src/components/business-batch-planner.tsx","utf8");
 const proxy=await readFile("src/app/api/public/corridors/batch/route.ts","utf8");
 const page=await readFile("src/app/app/business/batch/page.tsx","utf8");
 assert.match(page,/requireWalletIdentity/);
 assert.match(component,/loadBusinessCorridorBatch\(parsed\.routeIds,ctl\.signal\)/);
 assert.doesNotMatch(component,/localStorage|sessionStorage|submitSettlement|sendTransaction/);
 assert.match(proxy,/validCorridorBatch/);
 assert.match(proxy,/cache:"no-store"/);
 assert.doesNotMatch(proxy,/export async function POST|credentials:"include"/);
});
