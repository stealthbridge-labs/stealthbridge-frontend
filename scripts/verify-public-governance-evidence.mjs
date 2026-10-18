#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const REF="930fcdff5898abcd1e3f75704c4429f4b7ec4881";
const uri="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-contracts/"+
 REF+"/deployments/testnet/governance-deployment-evidence.v2.json";
const response=await fetch(uri,{redirect:"error",signal:AbortSignal.timeout(12000)});
if(!response.ok)throw new Error("Pinned Testnet release evidence is unreachable");
const source=await response.text();
if(source.length<100||source.length>12_000)throw new Error("Release evidence is oversized");
assert.equal(await readFile("src/lib/governance-release-evidence.v2.json","utf8"),source,
 "Public site release receipts must match the pinned reviewed contracts commit");
const record=JSON.parse(source);
assert.equal(record.network,"testnet");
assert.equal(Object.keys(record.contracts).length,3);
assert.deepEqual(record.scope,{
 governanceDeployed:true,privacyVerified:false,paymentExecutionEnabled:false,
 platformFeesEnabled:false,fiatPayoutEnabled:false
});
console.log("PASS: public release site displays exactly the reviewed Testnet governance evidence");
