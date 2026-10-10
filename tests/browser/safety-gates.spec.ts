import {readFileSync} from "node:fs";
import {expect,test,type Page} from "@playwright/test";

const testnetPassphrase="Test SDF Network ; September 2015";
const currentUnix=()=>Math.floor(Date.now()/1000);
const network=(passphrase:string,ageSeconds:number)=>({
 network:"testnet",passphrase,protocol_version:23,ledger_sequence:1234,
 ledger_closed_at_unix:String(currentUnix()-ageSeconds),ledger_hash:"a".repeat(64),source:"stellar-rpc"
});
const checkpoint=(ageSeconds:number)=>({
 ledger_sequence:1234,ledger_hash:"b".repeat(64),
 ledger_closed_at_unix:String(currentUnix()-ageSeconds),source:"stellar-rpc"
});

async function mockReadApi(page:Page,options:{
 state:"stale"|"recovered"|"degraded";
 passphrase?:string;
 malformedCapabilities?:boolean;
 paymentClaim?:boolean;
 contractsPayload?:unknown;
}){
 await page.route("**/api/bridge/**",async route=>{
  const request=route.request();
  const path=new URL(request.url()).pathname;
  const stale=options.state==="stale";
  const recovered=options.state==="recovered";
  if(path.endsWith("/v1/network")){
   if(options.state==="degraded")return route.abort("timedout");
   return route.fulfill({json:network(options.passphrase??testnetPassphrase,stale?600:10)});
  }
  if(path.endsWith("/ready")){
   if(options.state==="degraded")return route.fulfill({status:503,json:{code:"DEPENDENCIES_UNAVAILABLE"}});
   const ready=!stale&&options.passphrase===testnetPassphrase;
   return route.fulfill({json:{status:ready?"ready":"degraded",stellar_rpc:ready?"connected":"unavailable",database:ready?"connected":"unavailable",payments:"disabled"}});
  }
  if(path.endsWith("/v1/capabilities")){
   return route.fulfill({json:options.malformedCapabilities?
    {payments_enabled:true,confidential_token_verified:"yes",private_payments_verified:null,fiat_payouts_enabled:true}:
    {payments_enabled:!!options.paymentClaim,confidential_token_verified:!!options.paymentClaim,private_payments_verified:!!options.paymentClaim,fiat_payouts_enabled:!!options.paymentClaim}});
  }
  if(path.endsWith("/v1/observer")){
   if(options.state==="degraded")return route.fulfill({status:503,json:{code:"OBSERVER_UNAVAILABLE"}});
   return route.fulfill({json:checkpoint(stale?600:10)});
  }
  if(path.endsWith("/v1/corridors/page"))return route.fulfill({json:{items:[],next_cursor:null}});
  if(path.endsWith("/v1/contracts"))return options.contractsPayload ? route.fulfill({json:options.contractsPayload}) : route.fulfill({status:503,json:{code:"MANIFEST_UNAVAILABLE"}});
  return route.fulfill({status:404,json:{code:"NOT_FOUND"}});
 });
}

test("stale observer data is labeled and a retry restores live status",async({page})=>{
 let state:"stale"|"recovered"="stale";
 await page.route("**/api/bridge/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  const stale=state==="stale";
  if(path.endsWith("/v1/network"))return route.fulfill({json:network(testnetPassphrase,stale?600:10)});
  if(path.endsWith("/ready"))return route.fulfill({json:{status:stale?"degraded":"ready",stellar_rpc:stale?"unavailable":"connected",database:stale?"unavailable":"connected",payments:"disabled"}});
  if(path.endsWith("/v1/observer"))return route.fulfill({json:checkpoint(stale?600:10)});
  if(path.endsWith("/v1/capabilities"))return route.fulfill({json:{payments_enabled:false,confidential_token_verified:false,private_payments_verified:false,fiat_payouts_enabled:false}});
  if(path.endsWith("/v1/corridors/page"))return route.fulfill({json:{items:[],next_cursor:null}});
  if(path.endsWith("/v1/contracts"))return route.fulfill({status:503,json:{code:"MANIFEST_UNAVAILABLE"}});
  return route.fulfill({status:404,json:{code:"NOT_FOUND"}});
 });
 await page.goto("/preview/business");
 await expect(page.getByText("This ledger observation is stale.")).toBeVisible();
 await expect(page.getByText("This stored checkpoint is stale.")).toBeVisible();
 await expect(page.getByText("Degraded",{exact:true})).toBeVisible();

 const retry=page.getByRole("button",{name:"Retry observations"});
 await expect(retry).toBeEnabled();
 state="recovered";
 await retry.click();
 await expect(page.getByText("This ledger observation is stale.")).toHaveCount(0);
 await expect(page.getByText("This stored checkpoint is stale.")).toHaveCount(0);
 await expect(page.getByText("Dependencies connected")).toBeVisible();
});

test("RPC timeout is announced and can be retried without losing the last reading",async({page})=>{
 let recovered=false;
 await page.route("**/api/bridge/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/v1/network")){
   if(!recovered)return route.abort("timedout");
   return route.fulfill({json:network(testnetPassphrase,10)});
  }
  if(path.endsWith("/ready"))return route.fulfill({status:503,json:{code:"RPC_UNAVAILABLE"}});
  if(path.endsWith("/v1/capabilities"))return route.fulfill({json:{payments_enabled:false,confidential_token_verified:false,private_payments_verified:false,fiat_payouts_enabled:false}});
  if(path.endsWith("/v1/observer"))return route.fulfill({status:503,json:{code:"OBSERVER_UNAVAILABLE"}});
  if(path.endsWith("/v1/corridors/page"))return route.fulfill({json:{items:[],next_cursor:null}});
  if(path.endsWith("/v1/contracts"))return route.fulfill({status:503,json:{code:"MANIFEST_UNAVAILABLE"}});
  return route.fulfill({status:404,json:{code:"NOT_FOUND"}});
 });
 await page.goto("/preview/send");
 await expect(page.getByRole("alert").filter({hasText:/timed out|failed to fetch|network/i})).toBeVisible();
 const retry=page.getByRole("button",{name:"Retry observations"});
 await expect(retry).toBeEnabled();
 recovered=true;
 await retry.click();
 await expect(page.getByText(/Last observed/).first()).toBeVisible();
 await expect(page.getByText("Ledger 1,234").first()).toBeVisible();
});

const combinations=[
 {rail:"business",path:"/preview/business",passphrase:testnetPassphrase,malformed:false,paymentClaim:false},
 {rail:"business",path:"/preview/business",passphrase:"Public Global Stellar Network ; September 2015",malformed:true,paymentClaim:false},
 {rail:"send",path:"/preview/send",passphrase:testnetPassphrase,malformed:false,paymentClaim:true},
 {rail:"send",path:"/preview/send",passphrase:"Public Global Stellar Network ; September 2015",malformed:true,paymentClaim:false},
] as const;

for(const combination of combinations){
 test(`${combination.rail} transfer stays disabled for ${combination.passphrase===testnetPassphrase?"Testnet":"wrong network"} and ${combination.malformed?"malformed":"valid"} capabilities`,async({page})=>{
  const requests:string[]=[];
  page.on("request",request=>requests.push(`${request.method()} ${new URL(request.url()).pathname}`));
  await mockReadApi(page,{state:"recovered",passphrase:combination.passphrase,malformedCapabilities:combination.malformed,paymentClaim:combination.paymentClaim});
  await page.goto(combination.path);

  const transfer=page.getByRole("button",{name:/Transfer unavailable until protocol verification/});
  await expect(transfer).toBeDisabled();
  await expect(page.getByText("Supported",{exact:true})).toHaveCount(0);
  if(combination.passphrase!==testnetPassphrase)
   await expect(page.getByRole("alert").filter({hasText:"different Stellar network"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Connect Freighter"})).toBeEnabled();
  await page.getByRole("button",{name:"Connect Freighter"}).click();
  await expect(page.getByRole("alert").filter({hasText:"Freighter is not available"})).toBeVisible();
  await expect(transfer).toBeDisabled();
  await expect(page.locator("form")).toHaveCount(0);
  expect(requests.every(request=>request.startsWith("GET "))).toBe(true);
  expect(requests.some(request=>/settlement|transaction/i.test(request))).toBe(false);
 });
}


const VALID_WATCH_ONLY_ACCOUNT="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX"; // synthetic, checksum-valid only

test("watch-only account stays local and never becomes a connected wallet",async({page})=>{
 const requests:string[]=[];
 page.on("request",r=>requests.push(r.method()+" "+new URL(r.url()).pathname));
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.goto("/preview/send");
 const input=page.getByRole("textbox",{name:"Watch-only Stellar public address"});
 await input.fill(VALID_WATCH_ONLY_ACCOUNT);
 await page.getByRole("button",{name:"Watch address locally"}).click();
 await expect(page.getByText("Watch-only address · not connected")).toBeVisible();
 await expect(page.getByText(VALID_WATCH_ONLY_ACCOUNT)).toBeVisible();
 await expect(page.getByRole("link",{name:"Open public Testnet explorer (shares address with explorer)"}))
  .toHaveAttribute("href","https://stellar.expert/explorer/testnet/account/"+VALID_WATCH_ONLY_ACCOUNT);
 await expect(page.getByText("Freighter connected on Testnet")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Connect Freighter"})).toBeEnabled();
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
 await page.getByRole("button",{name:"Clear watched address"}).click();
 await expect(page.getByText(VALID_WATCH_ONLY_ACCOUNT)).toHaveCount(0);
 await expect(input).toHaveValue("");
 expect(requests.every(r=>r.startsWith("GET "))).toBe(true);
 expect(requests.some(r=>/v1\/transactions|v1\/settlements/.test(r))).toBe(false);
});

test("watch-only account rejects checksum errors and unsupported account types",async({page})=>{
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.goto("/preview/business");
 const input=page.getByRole("textbox",{name:"Watch-only Stellar public address"});
 for(const invalid of [VALID_WATCH_ONLY_ACCOUNT.slice(0,-1)+"A",
  "C"+VALID_WATCH_ONLY_ACCOUNT.slice(1),"G"+"A".repeat(55)]){
  await input.fill(invalid);
  await page.getByRole("button",{name:"Watch address locally"}).click();
  await expect(page.getByRole("alert").filter({hasText:"correct checksum"})).toBeVisible();
  await expect(page.getByText("Watch-only address · not connected")).toHaveCount(0);
 }
});


const sourceOnlyContracts={
 network:"testnet",source:"stealthbridge-contracts/deployments/testnet/manifest.json",
 on_chain_verified:false,payment_execution_enabled:false,
 manifest:{schemaVersion:1,network:"testnet",status:"not-deployed",verified:false,
  contractAddresses:{},assetIssuers:{},txHashes:[]},
 public_interface:JSON.parse(readFileSync("src/lib/public-soroban-interface.v1.json","utf8")),
};
test("three Soroban source interfaces render without claiming on-chain deployment",async({page})=>{
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase,contractsPayload:sourceOnlyContracts});
 await page.goto("/preview/business");
 await expect(page.getByText("Contracts not deployed")).toBeVisible();
 await expect(page.getByText("Governance gate: combined corridor/policy read defined in Rust", {exact:false})).toBeVisible();
 await expect(page.getByText(/Declared source modules:/)).toBeVisible();
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
});

test("falsely verified Soroban source metadata is rejected before the UI uses it",async({page})=>{
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase,
  contractsPayload:{...sourceOnlyContracts,on_chain_verified:true}});
 await page.goto("/preview/send");
 await expect(page.getByText("Contract information unavailable. No contract interaction can be verified.")).toBeVisible();
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
});

test("preview proxy has no writable wallet, corridor or settlement endpoints",async({request})=>{
 for(const path of ["/api/bridge/v1/corridors","/api/bridge/v1/settlements","/api/bridge/v1/contracts"]){
  const response=await request.post(path,{data:{address:"G"+"A".repeat(55)}});
  expect([404,405]).toContain(response.status());
 }
 const unknown=await request.get("/api/bridge/v1/wallets/G"+"A".repeat(55));
 expect(unknown.status()).toBe(404);
});