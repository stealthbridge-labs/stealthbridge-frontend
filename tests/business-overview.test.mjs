import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("business dashboard depends on verified account-scoped Neon records only",async()=>{
 const component=await readFile("src/components/business-overview.tsx","utf8");
 const page=await readFile("src/app/app/business/page.tsx","utf8");
 assert.match(component,/loadBusinessOnboarding\(address,controller.signal\)/);
 assert.match(component,/getAccountDirectory\(address,controller.signal\)/);
 assert.match(component,/Promise.allSettled/);
 assert.match(component,/state.status==="unavailable"/);
 assert.match(component,/pending.has_more/);
 assert.match(component,/directory.has_more/);
 assert.match(component,/Transfers not available/);
 assert.doesNotMatch(component,/localStorage|mockOrganization|fakeBalance|sendTransaction|approveTransfer/);
 assert.match(page,/<BusinessOverview address=\{identity.address\}/);
});
