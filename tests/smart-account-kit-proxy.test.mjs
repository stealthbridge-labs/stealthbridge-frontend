import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
import {SMART_ACCOUNT_PINS} from "../src/lib/smart-account-kit.ts";
// Exercise the real handler without starting Next. Only NextResponse's JSON
// adapter is replaced; fetch, host checks, bounded reading and validation run.
const source=(await readFile("src/app/api/public/smart-account-kit/route.ts","utf8"))
 .replace('import {NextResponse} from "next/server";',"const NextResponse={json:Response.json};")
 .replace('"@/lib/smart-account-kit"',JSON.stringify(new URL("../src/lib/smart-account-kit.ts",import.meta.url).href));
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {GET}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
function fixture(){return {schema_version:1,network:"testnet",source:"stellar-rpc/pinned-smart-account-kit",kit_version:"0.10.0",
 observed_at_unix:Math.floor(Date.now()/1000),observed_ledger_sequence:1000,
 entries:SMART_ACCOUNT_PINS.map(([name,kind,expected_wasm_hash])=>({name,kind,expected_wasm_hash,
  observed_wasm_hash:expected_wasm_hash,status:"live",live_until_ledger:201000,ttl_remaining_ledgers:200000})),
 all_entries_healthy:true,customer_smart_account_factory_deployed:false,customer_smart_account_created:false,
 credential_recovery_verified:false,privacy_proofs_verified:false,mainnet_enabled:false,financial_execution_enabled:false,operator_managed_deployment:true};}
test("public kit BFF forwards only validated bounded public metadata and safely rejects all failures",async()=>{
 const originalFetch=globalThis.fetch,originalOrigin=process.env.STEALTHBRIDGE_API_URL;
 const request=()=>new Request("https://stealthbridge.vercel.app/api/public/smart-account-kit",{headers:{cookie:"do-not-forward",authorization:"do-not-forward"}});
 let calls=0;
 try{
  process.env.STEALTHBRIDGE_API_URL="https://stealthbridge-backend.vercel.app";
  globalThis.fetch=async(url,options)=>{
   calls++;assert.equal(String(url),"https://stealthbridge-backend.vercel.app/v1/wallet/smart-account-kit");
   assert.equal(options.method,"GET");assert.equal(options.redirect,"error");assert.equal(options.cache,"no-store");
   assert.equal(options.credentials,"omit");assert.deepEqual(options.headers,{accept:"application/json"});
   assert.ok(options.signal instanceof AbortSignal);return Response.json(fixture());
  };
  const response=await GET(request());assert.equal(response.status,200);
  assert.equal(response.headers.get("cache-control"),"no-store");assert.equal((await response.json()).entries.length,7);
  assert.equal((await GET(new Request(request().url+"?url=https://attacker.example"))).status,400);
  assert.equal(calls,1);
  for(const origin of ["http://stealthbridge-backend.vercel.app","https://attacker.example","https://stealthbridge-backend.vercel.app:444",
   "https://user:pass@stealthbridge-backend.vercel.app","https://stealthbridge-backend.vercel.app/path","https://stealthbridge-backend.vercel.app?x=1"]){
   process.env.STEALTHBRIDGE_API_URL=origin;assert.equal((await GET(request())).status,503);
  }
  assert.equal(calls,1);
  process.env.STEALTHBRIDGE_API_URL="https://stealthbridge-backend.vercel.app";
  const cases=[
   ()=>Response.json({...fixture(),mainnet_enabled:true}),
   ()=>Response.json({...fixture(),observed_at_unix:1}),
   ()=>Response.json({error:"private upstream reason"},{status:500}),
   ()=>new Response("{}",{status:302,headers:{location:"https://attacker.example"}}),
   ()=>new Response("{}",{headers:{"content-type":"text/html"}}),
   ()=>new Response("{}",{headers:{"content-type":"application/json","content-length":"32769"}}),
   ()=>new Response(" ".repeat(32769),{headers:{"content-type":"application/json"}}),
   ()=>new Response("{",{headers:{"content-type":"application/json"}}),
   ()=>new Response(new Uint8Array([255]),{headers:{"content-type":"application/json"}}),
   ()=>{throw new DOMException("private timeout detail","TimeoutError");}
  ];
  for(const makeResponse of cases){globalThis.fetch=async()=>makeResponse();
   const result=await GET(request());assert.equal(result.status,503);
   assert.equal(result.headers.get("cache-control"),"no-store");
   assert.deepEqual(await result.json(),{code:"SMART_ACCOUNT_KIT_UNAVAILABLE"});
  }
 }finally{globalThis.fetch=originalFetch;if(originalOrigin===undefined)delete process.env.STEALTHBRIDGE_API_URL;else process.env.STEALTHBRIDGE_API_URL=originalOrigin;}
});
