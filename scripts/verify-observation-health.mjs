#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Reviewed, immutable Git SHA. No main/tag/latest references or runtime imports.
const SDK_REF="3bf69c478461958026839832627042bc3f1b9577";
const path="src/observation-health.ts";
const url=`https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/${SDK_REF}/${path}`;
const result=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(12_000)});
if(result.status!==200)throw new Error("Pinned SDK observation module is unavailable");
const upstream=await result.text();
if(upstream.length===0||upstream.length>20_000)
 throw new Error("SDK observation source exceeds the audited 20KiB ceiling");
const local=await readFile("src/lib/observation-health.ts","utf8");
assert.equal(local,upstream,"Frontend observation evaluator drifted from immutable SDK source");
for(const item of ["assessPublicObservations","appendPublicEvidence","publicEvidenceReceipt",
 "observerComparison","paymentExecutionEnabled:false"]){
 assert.ok(local.includes(item),"SDK observation invariant is missing: "+item);
}
const workspace=await readFile("src/components/observability-workspace.tsx","utf8");
for(const name of ["assessPublicObservations(","appendPublicEvidence(","publicEvidenceReceipt("]){
 assert.ok(workspace.includes(name),"Observability workspace must consume SDK evaluator: "+name);
}
assert.ok(!workspace.includes('fetch("http'),"Preview must not fetch arbitrary external origins");
console.log("PASS preview observations reuse exact SDK-reviewed Testnet assessment at "+SDK_REF);
