#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const REF="2b8339305af9a09ba059034b6ba15b0031f11dd0";
const url="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/"+
 REF+"/src/upgrade-review.ts";
const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(12000)});
if(!response.ok)throw new Error("Pinned SDK upgrade policy could not be verified");
const upstream=await response.text();
if(upstream.length<100||upstream.length>12_000)
 throw new Error("Pinned upgrade policy exceeds reviewed size limits");
assert.equal(await readFile("src/lib/upgrade-review.ts","utf8"),upstream,
 "Frontend upgrade policy must be pinned exactly to reviewed SDK source");
for(const mark of ["authorizedToExecute:false","manualSigningRequired:true",
 "financialExecutionEnabled:false","window-open-unverified"]){
 assert.ok(upstream.includes(mark),"Non-signing policy marker missing: "+mark);
}
console.log("PASS: frontend uses pinned SDK upgrade review and no signing claims");
