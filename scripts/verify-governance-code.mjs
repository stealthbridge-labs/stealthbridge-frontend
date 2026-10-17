#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const REF="755c5bf9bbecf792a131988996126e50ea564572";
const endpoint="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/"+REF+"/src/governance-code.ts";
const response=await fetch(endpoint,{redirect:"error",signal:AbortSignal.timeout(12000)});
if(!response.ok)throw new Error("Pinned SDK governance code assessment unavailable");
const upstream=await response.text();
if(upstream.length<100||upstream.length>16_384)throw new Error("Governance code assessment outside reviewed size bounds");
assert.equal(await readFile("src/lib/governance-code.ts","utf8"),upstream,
 "Governance live executable hash validator must exactly match SDK source");
for(const marker of ["payment_execution_enabled!==false","fee_collection_enabled!==false",
 "current_administrator_verified!==false","wasm_bytes_freshly_downloaded!==false"]){
 assert.ok(upstream.includes(marker),"Required fail-closed guard missing: "+marker);
}
console.log("PASS: frontend executable hash validation matches pinned SDK source");
