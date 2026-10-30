import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {COUNTRIES,countryName} from "../src/lib/customer-countries.ts";
test("customer countries are labels only and not hard-coded claims of payment availability",()=>{
 assert.equal(countryName("NG"),"Nigeria");
 assert.equal(countryName("GH"),"Ghana");
 assert.ok(COUNTRIES.length>30);
 assert.equal(new Set(COUNTRIES.map(([code])=>code)).size,COUNTRIES.length);
});
test("technical operator surfaces are gated; customer trust and routes hide developer internals",async()=>{
 const files=await Promise.all([
  "src/app/wallet/page.tsx","src/app/api/public/contract/[address]/route.ts",
  "src/app/platform/page.tsx","src/components/customer-route-explorer.tsx",
  "src/components/home.tsx","src/app/app/page.tsx"].map(f=>readFile(f,"utf8")));
 assert.match(files[0],/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(files[1],/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(files[2],/Your money is personal/);
 assert.doesNotMatch(files[2],/operator_local|WASM SHA|deployment wallet/);
 assert.doesNotMatch(files[3],/Record ID:|Catalog record|railLabel\(/);
 assert.match(files[3],/countryName\(row.origin_country\)/);
 assert.match(files[4],/Money moves/);
 assert.match(files[5],/View my account ID/);
});
