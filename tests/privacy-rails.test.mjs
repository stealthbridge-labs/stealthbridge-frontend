import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {describePrivacyRailForCustomer} from "../src/lib/privacy-rails.ts";

test("encrypted drafts never claim confidential on-chain settlement",()=>{
 const draft=describePrivacyRailForCustomer("local-encrypted-draft");
 assert.equal(draft.productionReady,false);
 assert.equal(draft.executionEnabled,false);
 assert.match(draft.whatRemainsPublic,/never creates confidential on-chain settlement/i);
});

test("personal private-payments and business confidential-token disclosures stay distinct",()=>{
 const spp=describePrivacyRailForCustomer("private-payments");
 const ct=describePrivacyRailForCustomer("confidential-token");
 assert.notEqual(spp.title,ct.title);
 assert.match(spp.whatRemainsPublic,/Deposit and withdrawal amounts, edge addresses/i);
 assert.match(ct.whatRemainsPublic,/Sender and recipient addresses, counterparty graph, auditor/i);
 assert.equal(spp.productionReady,false);
 assert.equal(ct.productionReady,false);
 assert.equal(spp.executionEnabled,false);
 assert.equal(ct.executionEnabled,false);
});

test("customer payment workspace surfaces non-interchangeable privacy disclosure copy",async()=>{
 const src=await readFile("src/components/customer-payment-workspace.tsx","utf8");
 assert.match(src,/describePrivacyRailForCustomer/);
 assert.match(src,/On-chain visibility/);
});
