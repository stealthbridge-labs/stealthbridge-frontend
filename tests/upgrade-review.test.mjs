import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {assessRegistryUpgrade} from "../src/lib/upgrade-review.ts";
const base=()=>({
 network:"testnet",registry:"policy-registry",
 paused:true,currentLedger:200,candidateWasmSha256:"ab".repeat(32),
 pending:{wasm_hash:"ab".repeat(32),ready_at_ledger:200,expires_at_ledger:10_200}
});
test("an open proposal never implies signing, payments or authorization",()=>{
 const r=assessRegistryUpgrade(base());
 assert.equal(r.state,"window-open-unverified");
 assert.equal(r.authorizedToExecute,false);
 assert.equal(r.manualSigningRequired,true);
 assert.equal(r.financialExecutionEnabled,false);
});
test("wrong hash, unexpected gate and expired timelocks fail closed",()=>{
 for(const patch of [
  {registry:"governance-gate"},
  {network:"mainnet"},
  {candidateWasmSha256:"ac".repeat(32)},
  {pending:{...base().pending,expires_at_ledger:201}},
 ])assert.equal(assessRegistryUpgrade({...base(),...patch}).state,"invalid");
 assert.equal(assessRegistryUpgrade({...base(),currentLedger:10_201}).state,"expired");
});
test("operator page is preview-only and cannot sign or submit contracts",async()=>{
 const page=await readFile("src/app/preview/upgrades/page.tsx","utf8");
 const workspace=await readFile("src/components/upgrade-review-workspace.tsx","utf8");
 assert.match(page,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(page,/notFound\(\)/);
 assert.match(workspace,/assessRegistryUpgrade\(/);
 assert.match(workspace,/authorizedToExecute/);
 assert.match(workspace,/UPGRADABLE-SOROBAN-OPERATIONS.md/);
 assert.doesNotMatch(workspace,/submitTransaction|signTransaction|sendPayment|privateKey/);
});
