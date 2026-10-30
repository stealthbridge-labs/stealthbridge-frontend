import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validClassicRecipientPresence,currentClassicRecipient} from "../src/lib/classic-recipient-presence.ts";
const address="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const now=1800000000;
const sample={schema_version:1,network:"testnet",source:"stellar-horizon/account-presence",
 address,observed_at_unix:now,classic_account_found:true,ownership_verified:false,
 asset_acceptance_verified:false,payment_execution_enabled:false};
test("recipient-check expires and is never account ownership or asset acceptance",()=>{
 assert.equal(validClassicRecipientPresence(sample,address,now),true);
 assert.equal(currentClassicRecipient(sample,address,now),true);
 for(const value of [{...sample,observed_at_unix:now-91},
  {...sample,observed_at_unix:now+31},{...sample,address:"bad"},
  {...sample,ownership_verified:true},{...sample,asset_acceptance_verified:true},
  {...sample,payment_execution_enabled:true},{...sample,balances:[]}])
  assert.equal(currentClassicRecipient(value,address,now),false);
 assert.equal(currentClassicRecipient({...sample,classic_account_found:false},address,now),false);
});
test("only consent-triggered classic public account reads and no backend payments",async()=>{
 const src=await readFile("src/components/customer-payment-workspace.tsx","utf8");
 const api=await readFile("src/app/api/public/classic-recipient/[address]/route.ts","utf8");
 assert.match(src,/Check recipient account/);
 assert.match(src,/currentClassicRecipient\(recipientEvidence,recipientAddress\)/);
 assert.match(src,/I have checked this full address with my recipient/);
 assert.match(src,/setRecipientName\(""?\)/);
 assert.match(src,/credentials:"omit"/);
 assert.match(api,/canonicalStellarAccountAddress\(address\)!==address/);
 assert.match(api,/validClassicRecipientPresence\(result,address\)/);
 assert.match(api,/\/v1\/wallet\/classic-recipient\//);
 assert.doesNotMatch(api,/signTransaction|sendPayment|submitTransaction/);
});
