import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("preview-only backend admin discovery remains GET only",async()=>{
 const route=await readFile("src/app/api/bridge/[...parts]/route.ts","utf8");
 const workspace=await readFile("src/components/governance-workspace.tsx","utf8");
 assert.match(route,/"v1\/governance\/admin"/);
 assert.match(workspace,/readGovernanceAdministrator/);
 assert.match(workspace,/signer|sign claims/i);
 assert.doesNotMatch(workspace,/signTransaction\(|claim_fees\(/);
});

test("frontend refuses administrator records that lack a fresh verified network time",async()=>{
 const validator=await readFile("src/lib/governance-administrator.ts","utf8");
 assert.match(validator,/observed_ledger_closed_at_unix/);
 assert.match(validator,/nowUnix-closed>180/);
 assert.match(validator,/nowUnix-closed< -30/);
 const view=await readFile("src/components/governance-workspace.tsx","utf8");
 assert.match(view,/Pending recovery nomination/);
 assert.match(view,/signer possession/i);
});
