import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validBusinessOnboarding,validBusinessApplicationName} from "../src/lib/business-onboarding.ts";
const account="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const application={id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 display_name:"Test Only Ltd",status:"pending",role:"owner"};
const envelope={schema_version:1,network:"testnet",source:"neon-pending-business-applications",
 account_address:account,applications:[application],has_more:false,
 organization_verified:false,payment_execution_enabled:false,
 organization_payment_authorized:false};
test("customer onboarding never masquerades as approved financial organization",()=>{
 assert.equal(validBusinessOnboarding(envelope,account),true);
 assert.equal(validBusinessOnboarding({...envelope,applications:[]},account),true);
 for(const forged of [
  {...envelope,network:"mainnet"},
  {...envelope,account_address:"G".repeat(56)},
  {...envelope,organization_verified:true},
  {...envelope,payment_execution_enabled:true},
  {...envelope,organization_payment_authorized:true},
  {...envelope,applications:[{...application,status:"active"}]},
  {...envelope,applications:[{...application,role:"admin"}]},
  {...envelope,applications:[application,application]},
  {...envelope,applications:[{...application,settlement_enabled:true}]}
 ])assert.equal(validBusinessOnboarding(forged,account),false);
 assert.equal(validBusinessApplicationName("Independent Importer"),true);
 assert.equal(validBusinessApplicationName("<script>"),false);
 assert.equal(validBusinessApplicationName("   "),false);
});
test("private onboarding proxy is signed by server, session gated, request bounded",async()=>{
 const s=await readFile("src/app/api/account/business-onboarding/route.ts","utf8");
 assert.match(s,/currentWalletIdentity\(\)/);
 assert.match(s,/validSameOrigin\(request\)/);
 assert.match(s,/createHmac\("sha256"/);
 assert.match(s,/randomUUID\(\)/);
 assert.match(s,/STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET/);
 assert.match(s,/MAX_BODY=16384/);
 assert.match(s,/validBusinessOnboarding\(data,session.address\)/);
 assert.doesNotMatch(s,/NEXT_PUBLIC_|submitPayment|kyc_verified:true/);
});

test("authenticated amendment and explicit withdrawal require safe, exact, verified receipts",async()=>{
 const mod=await import("../src/lib/business-onboarding.ts");
 const original=globalThis.fetch;
 const calls=[];
 try{
  globalThis.fetch=async(path,options)=>{
   calls.push([path,options.method,options.credentials,JSON.parse(options.body)]);
   const current=options.method==="PATCH"?{...application,display_name:"Renamed Test Ltd"}:null;
   return new Response(JSON.stringify({...envelope,applications:current?[current]:[]}),{
    status:200,headers:{"content-type":"application/json"}
   });
  };
  const edited=await mod.amendPendingBusiness(account,application.id,application.display_name,"Renamed Test Ltd");
  assert.equal(edited.applications[0].display_name,"Renamed Test Ltd");
  const withdrawn=await mod.withdrawPendingBusiness(account,application.id,"Renamed Test Ltd");
  assert.equal(withdrawn.applications.length,0);
  assert.deepEqual(calls,[
   ["/api/account/business-onboarding","PATCH","same-origin",
    {organization_id:application.id,expected_display_name:application.display_name,display_name:"Renamed Test Ltd"}],
   ["/api/account/business-onboarding","DELETE","same-origin",
    {organization_id:application.id,confirm_display_name:"Renamed Test Ltd"}]
  ]);
  await assert.rejects(()=>mod.amendPendingBusiness(account,application.id,"Same","Same"),TypeError);
  await assert.rejects(()=>mod.amendPendingBusiness(account,"../../other","Old","New"),TypeError);
  await assert.rejects(()=>mod.withdrawPendingBusiness(account,application.id,"<script>"),TypeError);
  globalThis.fetch=async()=>new Response(JSON.stringify({...envelope,organization_verified:true}),{status:200});
  await assert.rejects(()=>mod.withdrawPendingBusiness(account,application.id,"Renamed Test Ltd"),/could not be verified/);
  globalThis.fetch=async()=>new Response(JSON.stringify(envelope),{status:409});
  await assert.rejects(()=>mod.amendPendingBusiness(account,application.id,"Old","New"),/changed or now has protected/);
 }finally{globalThis.fetch=original;}
});
test("private pending management routes bind CSRF, signed nonce, digest and exact field set",async()=>{
 const route=await readFile("src/app/api/account/business-onboarding/route.ts","utf8");
 assert.match(route,/method!=="GET"&&!validSameOrigin\(request\)/);
 assert.match(route,/const id=method!=="GET"\?randomUUID\(\)/);
 assert.match(route,/const digest=method!=="GET"\?createHash/);
 assert.match(route,/method==="PATCH"/);
 assert.match(route,/method==="DELETE"/);
 assert.match(route,/APPLICATION_CHANGED_OR_PROTECTED/);
 assert.match(route,/validBusinessOnboarding\(data,session.address\)/);
 assert.doesNotMatch(route,/NEXT_PUBLIC_|payment_execution_enabled:true/);
});
