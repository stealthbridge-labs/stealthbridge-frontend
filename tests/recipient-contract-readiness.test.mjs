import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {activePublicContractAtAddress,validContractObservation} from "../src/lib/contract-observation.ts";

const address="CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
const observation=()=>({
 schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
 contract_address:address,contract_instance_found:true,observed_ledger_sequence:5244400,
 executable_wasm_hash:"a".repeat(64),live_until_ledger:5300000,
 smart_account_verified:false,signer_authority_verified:false,
 privacy_verified:false,payment_execution_enabled:false,fee_collection_enabled:false
});
test("public recipient inspection is exact-address and fails closed",()=>{
 assert.equal(validContractObservation(observation(),address),true);
 assert.equal(activePublicContractAtAddress(observation(),address),true);
 assert.equal(activePublicContractAtAddress(observation(),"C".repeat(56)),false);
 assert.equal(activePublicContractAtAddress({...observation(),smart_account_verified:true},address),false);
 assert.equal(activePublicContractAtAddress({...observation(),contract_instance_found:false,executable_wasm_hash:null,live_until_ledger:null},address),false);
 assert.equal(activePublicContractAtAddress({...observation(),live_until_ledger:5},address),false);
 assert.equal(activePublicContractAtAddress({...observation(),contract_address:"C".repeat(56)},"C".repeat(56)),false);
 assert.equal(activePublicContractAtAddress(null,address),false);
});
test("wallet UI checks C-address only on consent, clears stale evidence and cannot submit funds",async()=>{
 const src=await readFile("src/components/wallet-hub.tsx","utf8");
 assert.match(src,/Inspect recipient contract on Testnet/);
 assert.match(src,/activePublicContractAtAddress\(recipientEvidence,recipient\.trim\(\)\)/);
 assert.match(src,/recipientGeneration\.current\+\+;setRecipient/);
 assert.match(src,/setRecipientEvidence\(null\)/);
 assert.match(src,/preflight\.validLocalDraft&&recipientContractActive/);
 assert.match(src,/method:"GET",cache:"no-store"/);
 assert.doesNotMatch(src,/signTransaction|submitTransaction|sendPayment/);
});
