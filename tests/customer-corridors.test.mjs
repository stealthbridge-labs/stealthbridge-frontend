import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validCustomerCorridorPage,loadVerifiedCustomerCorridor,sameCustomerCorridor} from "../src/lib/customer-corridors.ts";

const a={
 id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"
};
test("published corridor records are strict metadata, never synthetic payout quotes",()=>{
 assert.equal(validCustomerCorridorPage({items:[a],next_cursor:null}),true);
 assert.equal(validCustomerCorridorPage({items:[a],next_cursor:a.id}),true);
 for(const row of [
  {...a,origin_country:"XXX"},
  {...a,destination_country:"NG"},
  {...a,privacy_rail:"unverified-rail"},
  {...a,exchange_rate:"1.25"},
  {...a,asset_issuer:""},
 ])assert.equal(validCustomerCorridorPage({items:[row],next_cursor:null}),false);
 assert.equal(validCustomerCorridorPage({items:[a,a],next_cursor:null}),false);
 assert.equal(validCustomerCorridorPage({items:[a],next_cursor:"not-a-cursor"}),false);
 assert.equal(validCustomerCorridorPage({items:[],next_cursor:a.id}),false);
 assert.equal(validCustomerCorridorPage({items:[],next_cursor:null}),true);
});
test("production corridor proxy admits GET-only, bounded input and no finance commands",async()=>{
 const route=await readFile("src/app/api/public/corridors/route.ts","utf8");
 assert.match(route,/export async function GET/);
 assert.match(route,/getAll\(key\).length!==1/);
 assert.match(route,/new URL\("\/v1\/corridors\/page\?limit=25"/);
 assert.match(route,/redirect:"error"/);
 assert.match(route,/cache:"no-store"/);
 assert.match(route,/MAX_BYTES=32768/);
 assert.doesNotMatch(route,/export async function POST|signTransaction|submitPayment/);
});

test("fresh corridor preflight validates strict exact ID and never sends payment details",async()=>{
 const previous=globalThis.fetch;
 const calls=[];
 try{
  globalThis.fetch=async (url,options)=>{
   calls.push({url,method:options.method,credentials:options.credentials});
   return new Response(JSON.stringify(a),{status:200,headers:{"content-type":"application/json"}});
  };
  const live=await loadVerifiedCustomerCorridor(a.id);
  assert.equal(sameCustomerCorridor(a,live),true);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,"/api/public/corridors/"+a.id);
  assert.equal(calls[0].method,"GET");
  assert.equal(calls[0].credentials,"omit");
  assert.equal(sameCustomerCorridor(a,{...live,asset_code:"EURC"}),false);
  assert.equal(sameCustomerCorridor(a,{...live,privacy_rail:"confidential-token"}),false);
  assert.equal(sameCustomerCorridor(a,{...live,asset_issuer:"G-replaced"}),false);
  await assert.rejects(()=>loadVerifiedCustomerCorridor("../internal/metrics"),TypeError);
  assert.equal(calls.length,1);
  globalThis.fetch=async()=>new Response(JSON.stringify({...a,asset_code:"x",fx_quote:"1.5"}));
  await assert.rejects(()=>loadVerifiedCustomerCorridor(a.id),/invalid corridor metadata/);
  globalThis.fetch=async()=>new Response(JSON.stringify({...a,id:"a3d87f01-c2ad-4a6a-b18a-95c3e5a61c03"}));
  await assert.rejects(()=>loadVerifiedCustomerCorridor(a.id),/does not match/);
  globalThis.fetch=async()=>new Response(JSON.stringify({code:"CORRIDOR_NO_LONGER_AVAILABLE"}),{status:404});
  await assert.rejects(()=>loadVerifiedCustomerCorridor(a.id),/could not be verified/);
 }finally{globalThis.fetch=previous;}
});
test("single route proxy is GET-only, response bounded and fails closed",async()=>{
 const route=await readFile("src/app/api/public/corridors/[id]/route.ts","utf8");
 assert.match(route,/export async function GET/);
 assert.match(route,/MAX_BYTES=4096/);
 assert.match(route,/CORRIDOR_NO_LONGER_AVAILABLE/);
 assert.match(route,/redirect:"error"/);
 assert.match(route,/validCustomerCorridorPage/);
 assert.doesNotMatch(route,/export async function POST|submitTransaction|walletSecret/);
});
