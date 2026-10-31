import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("onboarding is based only on signed-in saved preferences, never fabricated payments",async()=>{
 const home=await readFile("src/components/account-journey.tsx","utf8");
 const overview=await readFile("src/app/app/page.tsx","utf8");
 const settings=await readFile("src/components/customer-profile-settings.tsx","utf8");
 assert.match(home,/loadCustomerProfile\(address,ctl.signal\)/);
 assert.match(home,/setProfile\(result.profile\)/);
 assert.match(home,/account-journey-start/);
 assert.match(home,/profile\?\.use_case/);
 assert.match(home,/Your profile is not identity verification/);
 assert.doesNotMatch(home,/localStorage|fakeBalance|mockLedger|exampleTransaction|transferFunds/);
 assert.match(overview,/STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED/);
 assert.match(settings,/COUNTRIES\.map/);
 assert.match(settings,/validProfileInput\(profile\)/);
});
