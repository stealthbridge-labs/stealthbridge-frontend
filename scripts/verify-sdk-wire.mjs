#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Immutable reviewed SDK revision, not an npm latest/tag or dynamically fetched branch.
const SDK_REF="9e774cc6eb3b45da6940641f40fe64ced73fc50a";
const upstream=`https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/${SDK_REF}/src/generated/api-wire.ts`;
const local=await readFile("src/lib/sdk-api-wire.v0.2.ts","utf8");
const response=await fetch(upstream,{redirect:"error",signal:AbortSignal.timeout(12_000)});
if(!response.ok)throw new Error("Unable to inspect pinned SDK OpenAPI wire models");
const text=await response.text();
if(text.length>16_384)throw new Error("SDK generated wire-model size exceeds bounded budget");
assert.equal(local,text,"Frontend vendored SDK v0.2 wire types drifted from the pinned SDK revision");
const bridge=await readFile("src/lib/bridge-api.ts","utf8");
for(const [name,sdk] of Object.entries({
 NetworkStatus:"ApiNetworkStatus",Capabilities:"ApiCapabilities",
 Corridor:"ApiCorridor",TransactionObservation:"ApiTransactionObservation",
 ObservedLedgerCheckpoint:"ApiLedgerCheckpoint",
 CorridorPage:"ApiCorridorPage",ServiceReadiness:"ApiReadiness",
 ContractDiscovery:"ApiContractDiscovery"
})){
 assert.match(bridge,new RegExp("export interface "+name+" extends "+sdk+"\\b"),
  "Frontend "+name+" must inherit reviewed SDK wire models");
}
for(const gate of ["networkResponse(","capabilitiesResponse(","corridorsResponse(",
 "readFilteredCorridorPage(","checkpointResponse(","transactionResponse(",
 "contractDiscoveryResponse("]){
 assert.ok(bridge.includes(gate),"Missing runtime decoder "+gate);
}
assert.ok(!bridge.includes("method:\"POST\""),"Readonly browser client must never submit writes");
console.log("PASS frontend response types derive from immutable SDK v0.2 API wire models; runtime guards retained");
