import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validAccountDirectory,getAccountDirectory} from "../src/lib/account-directory.ts";

const address="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const record={schema_version:1,network:"testnet",source:"neon-active-memberships",
 account_address:address,organizations:[{id:"9a1a395f-249c-4907-b657-d48df4b38d28",
  display_name:"CI ONLY Organization",role:"viewer"}],has_more:false,
 payment_execution_enabled:false,organization_payment_authorized:false};
test("customer account membership data cannot spoof identity or financial permission",()=>{
 assert.equal(validAccountDirectory(record,address),true);
 for(const changed of [
  {...record,account_address:"G".repeat(56)},
  {...record,network:"mainnet"},
  {...record,payment_execution_enabled:true},
  {...record,organization_payment_authorized:true},
  {...record,organizations:[{...record.organizations[0],role:"admin",is_verified_bank:true}]},
  {...record,organizations:[record.organizations[0],record.organizations[0]]},
  {...record,organizations:[{...record.organizations[0],role:"root"}]},
  {...record,organizations:[{...record.organizations[0],display_name:"  Spoof  "}]}
 ]) assert.equal(validAccountDirectory(changed,address),false);
 assert.equal(validAccountDirectory({...record,organizations:[]},address),true);
});
test("account directory GET has session cookies but no asserted subject",async()=>{
 const current=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(url,options)=>{
   calls.push([url,options.method,options.credentials,options.body]);
   return new Response(JSON.stringify(record),{headers:{"content-type":"application/json"}});
  };
  assert.equal((await getAccountDirectory(address)).organizations.length,1);
  assert.deepEqual(calls,[["/api/account/directory","GET","same-origin",undefined]]);
  globalThis.fetch=async()=>new Response("",{status:503});
  await assert.rejects(()=>getAccountDirectory(address),/temporarily unavailable/);
 }finally{globalThis.fetch=current;}
});
test("server-only directory route enforces session and bounded signed proxy",async()=>{
 const code=await readFile("src/app/api/account/directory/route.ts","utf8");
 assert.match(code,/currentWalletIdentity\(\)/);
 assert.match(code,/createHmac\("sha256"/);
 assert.match(code,/STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET/);
 assert.match(code,/MAX_BODY=32768/);
 assert.match(code,/redirect:"error"/);
 assert.doesNotMatch(code,/NEXT_PUBLIC_|export async function POST|paymentExecution\(true\)/);
});
