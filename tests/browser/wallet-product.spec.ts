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

test("a user consents to live public C-address lookup without granting signing",async({page})=>{
 const contractCalls:string[]=[];
 await page.route("**/api/public/status",route=>route.fulfill({json:network()}));
 await page.route("**/api/public/contract/**",route=>{
  contractCalls.push(route.request().method()+" "+new URL(route.request().url()).pathname);
  return route.fulfill({json:{
   schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
   contract_address:C,contract_instance_found:true,
   observed_ledger_sequence:5275904,executable_wasm_hash:"a".repeat(64),
   live_until_ledger:5300000,smart_account_verified:false,
   signer_authority_verified:false,privacy_verified:false,
   payment_execution_enabled:false,fee_collection_enabled:false
  }});
 });
 await page.goto("/wallet?flow=send");
 const address=page.getByLabel("Already have a Soroban contract-account address?");
 const inspect=page.getByRole("button",{name:"Inspect contract on Testnet"});
 await expect(inspect).toBeDisabled();
 await address.fill(C);
 await expect(inspect).toBeEnabled();
 expect(contractCalls).toEqual([]);
 await inspect.click();
 await expect(page.getByText(/An active Soroban contract instance was found on Stellar Testnet/)).toBeVisible();
 await expect(page.getByText(/This does not verify a smart wallet, account ownership/)).toBeVisible();
 expect(contractCalls).toEqual(["GET /api/public/contract/"+C]);
 await expect(page.getByRole("button",{name:/Review privacy readiness/})).toBeDisabled();
});
test("forged contract signer authority is rejected and cannot enable a transfer",async({page})=>{
 await page.route("**/api/public/status",route=>route.fulfill({json:network()}));
 await page.route("**/api/public/contract/**",route=>route.fulfill({json:{
  schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
  contract_address:C,contract_instance_found:true,
  observed_ledger_sequence:5275904,executable_wasm_hash:"a".repeat(64),
  live_until_ledger:5300000,smart_account_verified:true,
  signer_authority_verified:false,privacy_verified:false,
  payment_execution_enabled:false,fee_collection_enabled:false
 }}));
 await page.goto("/wallet?flow=business");
 await page.getByLabel("Already have a Soroban contract-account address?").fill(C);
 await page.getByRole("button",{name:"Inspect contract on Testnet"}).click();
 await expect(page.getByRole("alert").filter({hasText:"unverified contract evidence"})).toBeVisible();
 await expect(page.getByText(/An active Soroban contract instance was found/)).toHaveCount(0);
 await expect(page.getByRole("button",{name:/Review privacy readiness/})).toBeDisabled();
});
