#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
// Read-only governance validation is owned by the reviewed TypeScript SDK.
const SDK_REF="f9b21fd8efd4cecbb26dd8e66c68fbaf94043343";
const upstream="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/"+
 SDK_REF+"/src/governance-release.ts";
const result=await fetch(upstream,{redirect:"error",signal:AbortSignal.timeout(12000)});
if(!result.ok)throw new Error("Pinned governance SDK validator unavailable");
const canonical=await result.text();
if(canonical.length<100||canonical.length>12_000)
 throw new Error("Governance SDK policy exceeds approved size bounds");
assert.equal(await readFile("src/lib/governance-release.ts","utf8"),canonical,
 "Frontend governance release validation must match the pinned reviewed SDK");
for(const mark of ["onchain_code_freshly_verified!==false",
  "payment_execution_enabled!==false","fee_collection_enabled!==false",
  "administrator_freshly_verified!==false"]){
 assert.ok(canonical.includes(mark),"Mandatory public safety marker missing: "+mark);
}
console.log("PASS: frontend governance release validator matches pinned SDK source");
