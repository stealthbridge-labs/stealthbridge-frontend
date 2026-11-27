import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("business workspace depends on verified account-scoped records only",async()=>{
 const c=await readFile("src/components/business/business-workspace.tsx","utf8");
 const page=await readFile("src/app/app/business/page.tsx","utf8");
 assert.match(c,/loadBusinessOnboarding\(address, ctl.signal\)/);
 assert.match(c,/getAccountDirectory\(address, ctl.signal\)/);
 // Each source renders only if it answered; "new business" needs both to answer empty.
 assert.match(c,/Promise.allSettled\(/);
 assert.match(c,/onboarding !== null && directory !== null && orgs.length === 0/);
 assert.match(c,/couldn&apos;t load your business applications/);
 assert.match(c,/couldn&apos;t load your organization memberships/);
 assert.match(c,/onboarding.has_more/);
 assert.match(c,/directory\?\.has_more/);
 assert.match(c,/Awaiting review/);
 assert.match(c,/doesn&apos;t establish legal identity or approve payments/);
 assert.match(c,/Membership doesn&apos;t authorize payments/);
 assert.doesNotMatch(c,/localStorage|mockOrganization|fakeBalance|sendTransaction|approveTransfer|verified business/i);
 assert.match(page,/<BusinessWorkspace address=\{identity.address\}/);
});
