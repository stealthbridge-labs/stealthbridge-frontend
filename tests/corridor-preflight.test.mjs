import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validCustomerCorridorPreflight,loadCustomerCorridorPreflight} from "../src/lib/corridor-preflight.ts";
const id="11111111-2222-4333-8444-555555555555";
const now=1800000000;
const corridor={id,origin_country:"NG",destination_country:"GB",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
const safe={schema_version:1,network:"testnet",source:"live-corridor-metadata-preflight",
 observed_at_unix:now,corridor,network_fresh:true,ledger_sequence:145,
 database_schema_ready:true,read_only_dependencies_ready:true,
 payment_execution_enabled:false,fee_quote_available:false,liquidity_verified:false,
 issuer_verified:false,privacy_verified:false,fiat_payouts_enabled:false};
test("route preflight validator rejects stale and forged capabilities",()=>{
 assert.equal(validCustomerCorridorPreflight(safe,id,now),true);
 for(const bad of [{...safe,network:"mainnet"},{...safe,fee_quote_available:true},
  {...safe,payment_execution_enabled:true},{...safe,privacy_verified:true},
  {...safe,liquidity_verified:true},{...safe,issuer_verified:true},
  {...safe,fiat_payouts_enabled:true},{...safe,observed_at_unix:now-121},
  {...safe,read_only_dependencies_ready:false},{...safe,ledger_sequence:null},
  {...safe,corridor:{...corridor,asset_code:"EURC"}},
  {...safe,unexpected:"authorized"}]){
  const expected=bad.corridor?.asset_code==="EURC"?id:undefined;
  if(expected)assert.equal(validCustomerCorridorPreflight(bad,id,now),true);
  else assert.equal(validCustomerCorridorPreflight(bad,id,now),false);
 }
 assert.equal(validCustomerCorridorPreflight({...safe,network_fresh:false,ledger_sequence:null,
  read_only_dependencies_ready:false},id,now),true);
 assert.equal(validCustomerCorridorPreflight({...safe,database_schema_ready:false,
  read_only_dependencies_ready:false},id,now),true);
});
test("browser loader sends only public corridor ID via GET",async()=>{
 const original=globalThis.fetch;let url="",opts;
 try{
  globalThis.fetch=async (target,options)=>{url=target;opts=options;
   return new Response(JSON.stringify({...safe,observed_at_unix:Math.floor(Date.now()/1000)}));};
  const res=await loadCustomerCorridorPreflight(id);
  assert.equal(res.corridor.id,id);
  assert.equal(url,"/api/public/corridors/"+id+"/preflight");
  assert.equal(opts.method,"GET");
  assert.equal(opts.credentials,"omit");
  await assert.rejects(()=>loadCustomerCorridorPreflight("../internal/metrics"),TypeError);
 }finally{globalThis.fetch=original;}
});
test("Send review consumes independent route preflight and preserves disabled execution",async()=>{
 const component=await readFile("src/components/customer-payment-workspace.tsx","utf8");
 const proxy=await readFile("src/app/api/public/corridors/[id]/preflight/route.ts","utf8");
 assert.match(component,/loadCustomerCorridorPreflight/);
 assert.match(component,/sameCustomerCorridor\(current,preflight\.corridor\)/);
 assert.match(component,/Math\.abs\(preflight\.ledger_sequence-observed\.ledger_sequence\)>2/);
 assert.match(component,/Transfer execution is not yet available/);
 assert.match(proxy,/validCustomerCorridorPreflight/);
 assert.doesNotMatch(proxy,/POST|privateKey|walletSignature/);
});

test("public route navigation only preserves a validated UUID across sign-in",async()=>{
 const {validAccountDestination}=await import("../src/lib/account-destination.ts");
 assert.equal(validAccountDestination("/app"),true);
 assert.equal(validAccountDestination("/app/send?corridor="+id),true);
 assert.equal(validAccountDestination("/app/business?corridor="+id),true);
 assert.equal(validAccountDestination("/app/business/payments"),true);
 assert.equal(validAccountDestination("/app/business/payments?corridor="+id),true);
 for(const bad of ["https://phishing.example","//phishing.example","/app/send?corridor=../evil",
  "/app/send?corridor="+id+"&admin=true","/app/send?amount=1000",
  "/app/business?redirect=https://example.com",
  "/app/business?corridor="+id+"&amount=2","/app/business?corridor="+id+"&corridor="+id,
  "/app/business/payments?corridor="+id+"&recipient=G-secret",
  "/app/business/payments?amount=9000"]){
  assert.equal(validAccountDestination(bad),false);
 }
 const routes=await readFile("src/components/customer-route-explorer.tsx","utf8");
 const signed=await readFile("src/components/customer-payment-workspace.tsx","utf8");
 assert.match(routes,/Review for my business/);
 assert.match(routes,/Review personal transfer/);
 assert.match(signed,/linkedRouteId/);
 assert.match(signed,/loadVerifiedCustomerCorridor\(requested,ctl\.signal\)/);
});
