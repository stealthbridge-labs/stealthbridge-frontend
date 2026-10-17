import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validGovernanceRelease} from "../src/lib/governance-release.ts";
test("frontend validator matches exact pinned SDK governance source",async()=>{
 const local=await readFile("src/lib/governance-release.ts","utf8");
 assert.match(local,/onchain_code_freshly_verified!==false/);
 assert.match(local,/fee_collection_enabled!==false/);
 assert.match(local,/deployment_transaction_confirmed===true/);
});
test("frontend denies fake live deployment and private payments",()=>{
 assert.equal(validGovernanceRelease({network:"testnet",payment_execution_enabled:true}),false);
 assert.equal(validGovernanceRelease({schema_version:1,network:"mainnet"}),false);
});
test("same-origin bridge proxy exposes ONLY read-only governance receipt path",async()=>{
 const proxy=await readFile("src/app/api/bridge/[...parts]/route.ts","utf8");
 const page=await readFile("src/app/preview/governance/page.tsx","utf8");
 assert.match(proxy,/"v1\/governance\/release"/);
 assert.match(page,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.doesNotMatch(proxy,/signTransaction\(/);
});
