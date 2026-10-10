import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Audited source revision from the passing three-contract reproducible build.
const CONTRACTS_REF="429f53f7a804271acc7c21d5ce8aba1b88d274bc";
const upstream="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-contracts/"+CONTRACTS_REF+"/integrations/public-soroban-interface.v1.json";
const local=JSON.parse(readFileSync("src/lib/public-soroban-interface.v1.json","utf8"));
const response=await fetch(upstream,{signal:AbortSignal.timeout(12_000),redirect:"error",headers:{accept:"application/json"}});
if(!response.ok)throw new Error("Cannot fetch pinned Soroban source interface for cross-repository parity");
const content=await response.text();
if(content.length>40_000)throw new Error("Soroban source interface exceeds approved budget");
const expected=JSON.parse(content);
assert.deepEqual(local,expected,"Frontend Soroban source interface drifted from pinned reviewed contracts");
assert.equal(local.network,"testnet");
assert.equal(local.status,"source-interface-only");
assert.deepEqual(Object.keys(local.contracts).sort(),["corridor-registry","governance-gate","policy-registry"]);
assert.deepEqual(local.contracts["governance-gate"].reads.public_flags_allow,
 {args:["String","String"],returns:"bool"});
assert.deepEqual(local.contracts["governance-gate"].writes,[]);
console.log("PASS: frontend three-contract source-only Soroban interface matches pinned reviewed contracts; no on-chain deployment implied.");
