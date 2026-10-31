import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const get=path=>readFile(path,"utf8");
test("the customer product has separate Home, Business and planning journeys",async()=>{
 const [home,business,planner,batch,shell,nav,root]=await Promise.all([
  get("src/app/app/page.tsx"),get("src/app/app/business/page.tsx"),
  get("src/app/app/business/payments/page.tsx"),
  get("src/app/app/business/batch/page.tsx"),
  get("src/components/account-shell.tsx"),get("src/components/account-navigation.tsx"),
  get("src/app/layout.tsx")
 ]);
 assert.doesNotMatch(home,/<AccountOrganizations|<TeamInvitations|<CustomerPaymentWorkspace/);
 assert.match(business,/<BusinessOnboarding/);
 assert.match(business,/<AccountOrganizations/);
 assert.match(business,/<TeamInvitations/);
 assert.doesNotMatch(business,/<CustomerPaymentWorkspace/);
 assert.match(business,/business-hub-action-grid/);
 assert.match(planner,/requireWalletIdentity\(\)/);
 assert.match(planner,/<CustomerPaymentWorkspace flow="business"/);
 assert.match(batch,/requireWalletIdentity\(\)/);
 assert.match(batch,/<BusinessBatchPlanner/);
 assert.match(shell,/id="main-content"/);
 assert.match(root,/className="skip-link" href="#main-content"/);
 assert.doesNotMatch(shell,/className="account-skip-link"/);
 for(const route of ["/app","/app/send","/app/business",
  "/app/business/payments","/app/business/batch","/app/settings"])
  assert.ok(nav.includes('href:"'+route+'"'),"Missing navigation route "+route);
 assert.match(nav,/aria-current=\{pathname===href/);
 assert.match(nav,/businessDetail\.test\(pathname\)/);
 assert.doesNotMatch(nav,/walletSecret|fakeBalance|submitPayment/);
});
test("business corridor links use dedicated payment planner",async()=>{
 const [routes,auth]=await Promise.all([
  get("src/components/customer-route-explorer.tsx"),
  get("src/lib/account-destination.ts")
 ]);
 assert.match(routes,/"\/app\/business\/payments"/);
 assert.match(auth,/\/app\/business\/payments\?corridor=/);
});
