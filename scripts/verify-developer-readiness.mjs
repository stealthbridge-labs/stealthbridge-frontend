#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
// Reviewed immutable SDK source commit, not a moving tag or branch.
const SDK_REF="328a86c0edb84e2e8bbeba293fbca70f9ce81b89";
const endpoint="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/"+
 SDK_REF+"/src/developer-readiness.ts";
const reply=await fetch(endpoint,{redirect:"error",signal:AbortSignal.timeout(12_000)});
if(!reply.ok)throw new Error("Pinned SDK developer preflight source is unavailable");
const upstream=await reply.text();
if(upstream.length<100||upstream.length>16_384)
 throw new Error("Preflight source exceeded approved size bounds");
const local=await readFile("src/lib/developer-readiness.ts","utf8");
assert.equal(local,upstream,"Developer diagnostics must match independently reviewed SDK source");
for(const marker of ["funds_movement_enabled: false","wallet_signing_enabled: false",
 "fiat_payouts_enabled: false","unsafe-claim","not-deployed"]){
 assert.ok(local.includes(marker),"Preflight invariant missing: "+marker);
}
const dashboard=await readFile("src/components/developer-workspace.tsx","utf8");
assert.ok(dashboard.includes("assessDeveloperReadiness("));
console.log("PASS: frontend uses pinned SDK developer preflight without payment claims");

const BUSINESS_SDK_REF="79497fb79986fcf0839f9655e3f81350865c04f2";
const businessReply=await fetch(
 "https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/"+
 BUSINESS_SDK_REF+"/src/business-review.ts",
 {redirect:"error",signal:AbortSignal.timeout(12_000)}
);
if(!businessReply.ok)throw new Error("Pinned SDK business review policy is unavailable");
const business=await businessReply.text();
if(business.length<100||business.length>16_384)
 throw new Error("Business policy source is outside reviewed size limits");
assert.equal(await readFile("src/lib/business-review.ts","utf8"),business,
 "Business approval preflight must match pinned SDK source");
for(const requirement of ["financialExecutionAuthorized:false","DUPLICATE_REVIEWER",
 "WRONG_ORGANIZATION","SAME_INITIATOR","MAX_RECORDS"]){
 assert.ok(business.includes(requirement),"Business policy review invariant missing: "+requirement);
}
console.log("PASS: business review policy matches pinned SDK and cannot authorize payment");
