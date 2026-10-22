import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validBusinessOnboarding,validBusinessApplicationName} from "../src/lib/business-onboarding.ts";
const account="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const application={id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 display_name:"Test Only Ltd",status:"pending",role:"owner"};
const envelope={schema_version:1,network:"testnet",source:"neon-pending-business-applications",
 account_address:account,applications:[application],has_more:false,
 organization_verified:false,payment_execution_enabled:false,
 organization_payment_authorized:false};
test("customer onboarding never masquerades as approved financial organization",()=>{
 assert.equal(validBusinessOnboarding(envelope,account),true);
 assert.equal(validBusinessOnboarding({...envelope,applications:[]},account),true);
 for(const forged of [
  {...envelope,network:"mainnet"},
  {...envelope,account_address:"G".repeat(56)},
  {...envelope,organization_verified:true},
  {...envelope,payment_execution_enabled:true},
  {...envelope,organization_payment_authorized:true},
  {...envelope,applications:[{...application,status:"active"}]},
  {...envelope,applications:[{...application,role:"admin"}]},
  {...envelope,applications:[application,application]},
  {...envelope,applications:[{...application,settlement_enabled:true}]}
 ])assert.equal(validBusinessOnboarding(forged,account),false);
 assert.equal(validBusinessApplicationName("Independent Importer"),true);
 assert.equal(validBusinessApplicationName("<script>"),false);
 assert.equal(validBusinessApplicationName("   "),false);
});
test("private onboarding proxy is signed by server, session gated, request bounded",async()=>{
 const s=await readFile("src/app/api/account/business-onboarding/route.ts","utf8");
 assert.match(s,/currentWalletIdentity\(\)/);
 assert.match(s,/validSameOrigin\(request\)/);
 assert.match(s,/createHmac\("sha256"/);
 assert.match(s,/randomUUID\(\)/);
 assert.match(s,/STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET/);
 assert.match(s,/MAX_BODY=16384/);
 assert.match(s,/validBusinessOnboarding\(data,session.address\)/);
 assert.doesNotMatch(s,/NEXT_PUBLIC_|submitPayment|kyc_verified:true/);
});
