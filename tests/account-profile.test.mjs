import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validProfileInput,validProfileEnvelope} from "../src/lib/account-profile.ts";
const address="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const input={display_name:"Test account",use_case:"personal",residence_country:"NG"};
const envelope={schema_version:1,network:"testnet",source:"neon-customer-profiles",
 account_address:address,profile:{...input,updated_at_unix:1800000000},
 payment_execution_enabled:false,organization_payment_authorized:false};
test("profile validator rejects inflated identity, financial claims and invalid preferences",()=>{
 assert.equal(validProfileInput(input),true);
 assert.equal(validProfileEnvelope(envelope,address),true);
 assert.equal(validProfileEnvelope({...envelope,profile:null},address),true);
 for(const invalid of [
  {...input,kyc_approved:true},{...input,display_name:"<script>"},
  {...input,display_name:"  Bad  "},{...input,use_case:"owner"},
  {...input,residence_country:"NGA"}
 ])assert.equal(validProfileInput(invalid),false);
 assert.equal(validProfileEnvelope({...envelope,payment_execution_enabled:true},address),false);
 assert.equal(validProfileEnvelope({...envelope,organization_payment_authorized:true},address),false);
 assert.equal(validProfileEnvelope({...envelope,profile:{...input,updated_at_unix:0}},address),false);
 assert.equal(validProfileEnvelope({...envelope,account_address:"G".repeat(56)},address),false);
});
test("customer profile proxy verifies signed session and exact method-body authority",async()=>{
 const route=await readFile("src/app/api/account/profile/route.ts","utf8");
 assert.match(route,/currentWalletIdentity\(\)/);
 assert.match(route,/validSameOrigin\(request\)/);
 assert.match(route,/createHmac\("sha256"/);
 assert.match(route,/randomUUID\(\)/);
 assert.match(route,/PROFILE_STORAGE_UNAVAILABLE/);
 assert.match(route,/export async function PATCH/);
 assert.doesNotMatch(route,/NEXT_PUBLIC_|walletSecret|submitPayment/);
});
