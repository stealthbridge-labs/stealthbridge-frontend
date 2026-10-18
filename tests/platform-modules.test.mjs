import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validPlatformCatalog, PLATFORM_MODULES} from "../src/lib/platform-modules.ts";

const blocked=new Set(["quotes","payments","batch-payouts","privacy-proofs","partner-settlement"]);
const fixture=()=>({
 product:"StealthBridge",network:"testnet",payment_execution_enabled:false,
 privacy_verified:false,mainnet_enabled:false,
 modules:PLATFORM_MODULES.map(id=>({
   id,audiences:["consumer"],description:"Not an available payment product",
   availability:id==="corridors"?"metadata-only":blocked.has(id)?"blocked":"planned",
 })),
});
test("product catalog accepts only complete conservative backend inventory",()=>{
 const item=fixture();assert.equal(validPlatformCatalog(item),true);
 for(const prop of ["payment_execution_enabled","privacy_verified","mainnet_enabled"]){
  const forged=fixture();forged[prop]=true;assert.equal(validPlatformCatalog(forged),false);
 }
 const missing=fixture();missing.modules.pop();assert.equal(validPlatformCatalog(missing),false);
 const switched=fixture();switched.modules[0].availability="metadata-only";
 assert.equal(validPlatformCatalog(switched),false);
 const promoted=fixture();promoted.modules[3].availability="planned";
 assert.equal(validPlatformCatalog(promoted),false);
});
test("preview proxy remains read-only and only permits exact platform inventory path",async()=>{
 const proxy=await readFile("src/app/api/bridge/[...parts]/route.ts","utf8");
 assert.match(proxy,/v1\/platform\/modules/);
 assert.match(proxy,/export async function GET/);
 assert.doesNotMatch(proxy,/export async function POST/);
 assert.match(proxy,/path==="v1\/corridors\/page"/);
});
test("new product workspace is preview-only with honest payment-state disclosure",async()=>{
 const page=await readFile("src/app/preview/modules/page.tsx","utf8");
 const workspace=await readFile("src/components/platform-modules-workspace.tsx","utf8");
 assert.match(page,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(page,/notFound\(\)/);
 assert.match(workspace,/Financial execution/);
 assert.match(workspace,/readPlatformModules/);
 assert.doesNotMatch(workspace,/submitTransaction|signTransaction|submitPayment/);
});
