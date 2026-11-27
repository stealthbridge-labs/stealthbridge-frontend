import {test} from "node:test";
import assert from "node:assert/strict";
import {MECHANISMS,PERSONAL_RAIL,BUSINESS_RAIL,railAvailable} from "../src/lib/privacy-capabilities.ts";

test("privacy rails cannot be available while the lock says NO_GO",()=>{
 assert.equal(PERSONAL_RAIL.verdict,"NO_GO");assert.equal(BUSINESS_RAIL.verdict,"NO_GO");
 assert.equal(railAvailable("personal-shielded-pool"),false);
 assert.equal(railAvailable("business-confidential-token"),false);
});
test("only the public passkey payment and draft encryption are live, and neither is called private",()=>{
 const live=MECHANISMS.filter(m=>m.status==="live-testnet").map(m=>m.id).sort();
 assert.deepEqual(live,["draft-encryption","public-transfer"]);
 assert.match(MECHANISMS.find(m=>m.id==="public-transfer").public,/amount and time are visible/);
 assert.match(MECHANISMS.find(m=>m.id==="draft-encryption").public,/not on-chain privacy/);
 assert.match(MECHANISMS.find(m=>m.id==="business-confidential-token").public,/Sender and recipient addresses/);
});
test("personal rail lists its single-party setup blocker",()=>{
 assert.ok(PERSONAL_RAIL.blockers.some(b=>/single-party trusted setup/.test(b)));
});
