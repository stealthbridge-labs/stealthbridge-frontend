import {expect,test} from "@playwright/test";

const network=()=>({
 source:"stealthbridge-public-testnet-read",network:"testnet",
 passphrase:"Test SDF Network ; September 2015",
 ledger_sequence:5275903,ledger_closed_at_unix:String(Math.floor(Date.now()/1000)-5),
 payment_execution_enabled:false,confidential_token_verified:false,
 private_payments_verified:false,fiat_payouts_enabled:false,
 smart_account_deployment_verified:false
});
const G="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const C="CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";

test("public wallet integrates real Testnet readiness but never implies funds can move",async({page})=>{
 const calls:string[]=[];
 await page.route("**/api/public/status",route=>{
  calls.push(route.request().method()+" "+new URL(route.request().url()).pathname);
  return route.fulfill({json:network()});
 });
 const response=await page.goto("/wallet?flow=send");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:"Send with StealthBridge."})).toBeVisible();
 await expect(page.getByText(/Stellar Testnet connected · ledger #/)).toBeVisible();
 await expect(page.getByRole("button",{name:"Connect Freighter"})).toBeVisible();
 await page.getByLabel("Recipient's Stellar address").fill(G);
 await page.getByLabel("Intended amount · asset unspecified").fill("25.50");
 await expect(page.getByRole("button",{name:/Review privacy readiness/})).toBeDisabled();
 await expect(page.getByText(/Your details were not sent/)).toHaveCount(0);
 expect(calls).toEqual(["GET /api/public/status"]);
});
test("smart-account address format is validated without claiming wallet control",async({page})=>{
 await page.route("**/api/public/status",route=>route.fulfill({json:network()}));
 await page.goto("/wallet?flow=business");
 const watch=page.getByLabel("Already have a Soroban contract-account address?");
 await watch.fill("not-a-contract");
 await expect(page.getByText(/Enter a valid C-address/)).toBeVisible();
 await watch.fill(C);
 await page.getByRole("button",{name:"Check device passkey support"}).click();
 await expect(page.getByRole("status").filter({hasText:/passkey|authenticator/i}).first()).toBeVisible();
 await expect(page.getByText(/Ownership and wallet authorization are not verified/)).toBeVisible();
 await expect(page.getByText(/No smart-account factory or relayer has been deployed/)).toBeVisible();
});
test("unavailable backend is visible; no amount privacy or transfer is implied",async({page})=>{
 await page.route("**/api/public/status",route=>route.fulfill({status:503,json:{code:"PUBLIC_NETWORK_UNAVAILABLE"}}));
 await page.goto("/wallet");
 await expect(page.getByText(/Live network unavailable/)).toBeVisible();
 await expect(page.getByRole("button",{name:/Review privacy readiness/})).toBeDisabled();
});
