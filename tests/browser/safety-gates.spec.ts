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
test("invented or changed Soroban method signatures cannot reach the frontend",async({page})=>{
 const forged=structuredClone(sourceOnlyContracts);
 forged.public_interface.contracts["governance-gate"].reads.public_flags_allow.args=["String"];
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase,contractsPayload:forged});
 await page.goto("/preview/business");
 await expect(page.getByText("Contract information unavailable. No contract interaction can be verified.")).toBeVisible();
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
});
test("read-only corridor proxy rejects malformed/duplicated filters before upstream fetch",async({request})=>{
 for(const invalid of [
  "origin_country=ng","destination_country=USA",
  "origin_country=N%20G","privacy_rail=live-payout",
  "privacy_rail=CONFIDENTIAL-TOKEN",
  "origin_country=NG&origin_country=GH",
  "destination_country=KE&destination_country=GH",
  "privacy_rail=private-payments&privacy_rail=confidential-token",
  "sort=created_at","limit=200"
 ]){
  const response=await request.get("/api/bridge/v1/corridors/page?"+invalid);
  expect(response.status(),invalid).toBe(400);
 }
 const valid=await request.get(
  "/api/bridge/v1/corridors/page?origin_country=NG&destination_country=GH&privacy_rail=confidential-token&limit=2"
 );
 expect(valid.status()).not.toBe(400);
});
test("Soroban registry page renders canonical Rust modules and interactive method signatures",async({page})=>{
 const requests:string[]=[];
 page.on("request",request=>{if(request.url().includes("/api/bridge/"))requests.push(request.method()+" "+new URL(request.url()).pathname);});
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase,contractsPayload:sourceOnlyContracts});
 await page.goto("/preview/contracts");
 await expect(page.getByRole("heading",{name:"Soroban Registry Explorer"})).toBeVisible();
 await expect(page.getByText("ABI matched")).toBeVisible();
 await expect(page.getByText("Not deployed",{exact:true}).first()).toBeVisible();
 await expect(page.getByRole("button",{name:/Corridor registry/})).toHaveAttribute("aria-pressed","true");
 await page.getByRole("button",{name:/Policy registry/}).click();
 await expect(page.getByRole("heading",{name:"Policy registry"})).toBeVisible();
 await page.getByRole("button",{name:"get_rule",exact:true}).click();
 await expect(page.getByText("get_rule(String) → Option<PolicyRecord>")).toBeVisible();
 await page.getByRole("button",{name:/Governance gate/}).click();
 await page.getByRole("button",{name:"public_flags_allow",exact:true}).click();
 await expect(page.getByText("public_flags_allow(String, String) → bool")).toBeVisible();
 await expect(page.getByText("No write functions declared for this contract.")).toBeVisible();
 await expect(page.getByText(/Signing and transfers remain disabled/)).toBeVisible();
 expect(requests.length).toBeGreaterThan(0);
 expect(requests.every(value=>value.startsWith("GET "))).toBe(true);
 expect(requests.every(value=>!value.includes("/settlements"))).toBe(true);
});

test("Soroban registry explorer rejects falsely deployed source metadata",async({page})=>{
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase,
  contractsPayload:{...sourceOnlyContracts,on_chain_verified:true}});
 await page.goto("/preview/contracts");
 await expect(page.getByRole("alert").filter({hasText:"Unable to verify contract discovery."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Policy registry"})).toHaveCount(0);
 await expect(page.getByText("ABI matched")).toHaveCount(0);
 await expect(page.getByText("Disabled",{exact:true})).toBeVisible();
});

test("Soroban registry page is responsive and retries failed metadata reads",async({page})=>{
 let restored=false;
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/v1/contracts"))return restored?
    route.fulfill({json:sourceOnlyContracts}):
    route.fulfill({status:503,json:{code:"API_UNAVAILABLE"}});
  if(path.endsWith("/v1/network"))return route.fulfill({json:network(testnetPassphrase,10)});
  if(path.endsWith("/ready"))return route.fulfill({json:{status:"ready",stellar_rpc:"connected",database:"connected",payments:"disabled"}});
  if(path.endsWith("/v1/capabilities"))return route.fulfill({json:{payments_enabled:false,confidential_token_verified:false,private_payments_verified:false,fiat_payouts_enabled:false}});
  return route.fulfill({status:404,json:{code:"NOT_FOUND"}});
 });
 await page.goto("/preview/contracts");
 await expect(page.getByRole("alert").filter({hasText:"Unable to verify contract discovery."})).toBeVisible();
 restored=true;
 await page.getByRole("button",{name:"Refresh verification"}).click();
 await expect(page.getByRole("button",{name:/Governance gate/})).toBeVisible();
 await expect(page.getByText("ABI matched")).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});
test("corridor directory filters real backend rows and paginates without payment requests",async({page})=>{
 const firstId="a1b2c3d4-1111-4111-8111-111111111111";
 const secondId="b1b2c3d4-1111-4111-8111-111111111111";
 const calls:string[]=[];
 await page.route("**/api/bridge/**",async route=>{
  const request=route.request();
  calls.push(request.method()+" "+request.url());
  const url=new URL(request.url());
  if(url.pathname.endsWith("/v1/corridors/page")){
   const filtered=url.searchParams.get("origin_country")==="NG" &&
    url.searchParams.get("destination_country")==="GH" &&
    url.searchParams.get("privacy_rail")==="confidential-token";
   if(!filtered)return route.fulfill({json:{items:[],next_cursor:null}});
   const after=url.searchParams.get("after");
   const id=after?secondId:firstId;
   return route.fulfill({json:{items:[{id,origin_country:"NG",destination_country:"GH",
    asset_code:"TEST_ONLY",asset_issuer:null,privacy_rail:"confidential-token"}],
    next_cursor:after?null:firstId}});
  }
  return route.fulfill({status:404,json:{code:"NOT_FOUND"}});
 });
 await page.goto("/preview/corridors");
 await expect(page.getByRole("heading",{name:"Corridor Directory"})).toBeVisible();
 await expect(page.getByText("No enabled corridors match")).toBeVisible();
 await page.getByLabel("Origin country (optional)").fill("ng");
 await page.getByLabel("Destination country (optional)").fill("gh");
 await page.getByLabel("Privacy research rail").selectOption("confidential-token");
 await page.getByRole("button",{name:"Apply filters"}).click();
 await expect(page.getByRole("heading",{name:"NG → GH"})).toBeVisible();
 await expect(page.getByText("1 real records loaded")).toBeVisible();
 await page.getByRole("button",{name:"Load next page"}).click();
 await expect(page.getByText("2 real records loaded")).toBeVisible();
 await expect(page.getByRole("button",{name:"Load next page"})).toHaveCount(0);
 expect(calls.every(value=>value.startsWith("GET "))).toBe(true);
 expect(calls.every(value=>!value.includes("/settlements"))).toBe(true);
 expect(calls.filter(value=>value.includes("origin_country=NG")).length).toBe(2);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("corridor directory refuses an API row that does not match submitted filters",async({page})=>{
 await page.route("**/api/bridge/v1/corridors/page**",route=>{
  const url=new URL(route.request().url());
  const origin=url.searchParams.get("origin_country");
  if(!origin)return route.fulfill({json:{items:[],next_cursor:null}});
  return route.fulfill({json:{items:[{id:"a1b2c3d4-1111-4111-8111-111111111111",
   origin_country:"US",destination_country:"GH",asset_code:"TEST_ONLY",asset_issuer:null,
   privacy_rail:"confidential-token"}],next_cursor:null}});
 });
 await page.goto("/preview/corridors");
 await page.getByLabel("Origin country (optional)").fill("NG");
 await page.getByRole("button",{name:"Apply filters"}).click();
 await expect(page.getByRole("alert").filter({hasText:"invalid or out-of-order page"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"US → GH"})).toHaveCount(0);
 await page.getByLabel("Origin country (optional)").fill("N1");
 await page.getByRole("button",{name:"Apply filters"}).click();
 await expect(page.getByRole("alert").filter({hasText:"two-letter country codes"})).toBeVisible();
});
test("Testnet workspace home renders real backend health and navigates to interaction pages",async({page})=>{
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase,contractsPayload:sourceOnlyContracts});
 await page.goto("/preview");
 await expect(page.getByRole("heading",{name:"Build on verified ground."})).toBeVisible();
 await expect(page.getByText("Connected",{exact:true})).toBeVisible();
 await expect(page.getByText("Source only",{exact:true})).toBeVisible();
 await expect(page.getByRole("link",{name:/Soroban registry/})).toHaveAttribute("href","/preview/contracts");
 await expect(page.getByRole("link",{name:/Corridor directory/})).toHaveAttribute("href","/preview/corridors");
 await page.getByRole("link",{name:/Soroban registry/}).click();
 await expect(page.getByRole("heading",{name:"Soroban Registry Explorer"})).toBeVisible();
});

test("Testnet workspace home shows unverified dependencies without fictional availability",async({page})=>{
 await mockReadApi(page,{state:"degraded",passphrase:testnetPassphrase});
 await page.goto("/preview");
 await expect(page.getByText("Unverified",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("Not confirmed",{exact:true})).toBeVisible();
 await expect(page.getByText("Disabled",{exact:true})).toBeVisible();
 await expect(page.getByRole("link",{name:/Business workspace/})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});
test("technical preview is read-only and declares missing backend instead of faking readiness",async({request})=>{
 const network=await request.get("/api/bridge/v1/network");
 expect(network.status()).toBe(503);
 const body=await network.json();
 expect(body.code).toBe("API_UNCONFIGURED");
 const write=await request.post("/api/bridge/v1/settlements",{data:{}});
 expect(write.status()).toBe(405);
});

test("corridor URL filters survive reload and long issuer identities remain readable",async({page})=>{
 const origin="NG",destination="GH",rail="confidential-token";
 const issuer="G"+"A".repeat(127);
 const code="ASSET_"+"A".repeat(58);
 const seen:string[]=[];
 await page.route("**/api/bridge/v1/corridors/page**",async route=>{
  const uri=new URL(route.request().url());
  seen.push(uri.search);
  return route.fulfill({json:{items:[{
   id:"a1b2c3d4-1111-4111-8111-111111111111",
   origin_country:origin,destination_country:destination,
   asset_code:code,asset_issuer:issuer,privacy_rail:rail
  }],next_cursor:null}});
 });
 await page.goto("/preview/corridors?origin_country=NG&destination_country=GH&privacy_rail=confidential-token");
 await expect(page.getByLabel("Origin country (optional)")).toHaveValue(origin);
 await expect(page.getByLabel("Destination country (optional)")).toHaveValue(destination);
 await expect(page.getByLabel("Privacy research rail")).toHaveValue(rail);
 await expect(page.getByRole("heading",{name:"NG → GH"})).toBeVisible();
 await expect(page.locator(".corridor-result code")).toHaveText(issuer);
 await expect(page.getByText(code,{exact:false})).toBeVisible();
 await expect(page.getByText("Fiat payout provider: not configured or verified.",{exact:false})).toBeVisible();
 await expect(page.getByText(/payout eligibility/).first()).toBeVisible();
 await page.reload();
 await expect(page.getByLabel("Origin country (optional)")).toHaveValue(origin);
 await expect(page.getByRole("heading",{name:"NG → GH"})).toBeVisible();
 expect(seen.some(x=>x.includes("origin_country=NG")&&x.includes("destination_country=GH")&&x.includes("privacy_rail=confidential-token"))).toBe(true);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(2);
 await page.getByRole("button",{name:"Clear"}).click();
 await expect(page).toHaveURL(/\/preview\/corridors$/);
});

test("invalid or duplicate deep-link filters cannot make up a configured corridor",async({page})=>{
 await page.route("**/api/bridge/v1/corridors/page**",route=>route.fulfill({json:{items:[],next_cursor:null}}));
 await page.goto("/preview/corridors?origin_country=NG&origin_country=US");
 await expect(page.getByRole("alert").filter({hasText:/repeated corridor filters/})).toBeVisible();
 await expect(page.getByText("No enabled corridors match")).toBeVisible();
 await page.getByRole("button",{name:"Clear"}).click();
 await expect(page).toHaveURL(/\/preview\/corridors$/);
});

async function installFakeFreighter(page:Page,options:{authorized:boolean;networkPassphrase?:string;denyRequest?:boolean;switchAddressOnAccess?:boolean;revokeAfterAccess?:boolean;switchNetworkOnAccess?:boolean}){
 await page.addInitScript(({authorized,networkPassphrase,denyRequest,account})=>{
  const testnetPassphrase="Test SDF Network ; September 2015";
  const replacementAccount="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
  const bridge=window as typeof window&{
   mockAllowed:boolean;mockNetwork:string;mockAddress:string;mockDenied:boolean;
   freighterRequests:string[];
  };
  Object.defineProperty(bridge,"freighter",{value:true,configurable:true});
  bridge.mockAllowed=authorized;
  bridge.mockNetwork=networkPassphrase;
  bridge.mockAddress=account;
  bridge.mockDenied=denyRequest;
  bridge.freighterRequests=[];
  window.addEventListener("message",event=>{
   const packet=event.data as {source?:string;messageId?:number;type?:string};
   if(event.source!==window||packet.source!=="FREIGHTER_EXTERNAL_MSG_REQUEST")return;
   bridge.freighterRequests.push(packet.type??"");
   let body:Record<string,unknown>={};
   switch(packet.type){
    case "REQUEST_ALLOWED_STATUS":body={isAllowed:bridge.mockAllowed};break;
    case "REQUEST_PUBLIC_KEY":body={publicKey:bridge.mockAllowed?bridge.mockAddress:""};break;
    case "REQUEST_NETWORK_DETAILS":body={networkDetails:{network:bridge.mockNetwork===testnetPassphrase?"TESTNET":"PUBLIC",
      networkPassphrase:bridge.mockNetwork}};break;
    case "REQUEST_ACCESS":
      body=bridge.mockDenied?{publicKey:"",apiError:{code:-4,message:"Access denied by wallet."}}:
       {publicKey:bridge.mockAddress};
      if(!bridge.mockDenied){
       bridge.mockAllowed=!revokeAfterAccess;
       if(switchAddressOnAccess)bridge.mockAddress=replacementAccount;
       if(switchNetworkOnAccess)bridge.mockNetwork="Public Global Stellar Network ; September 2015";
      }
      break;
    default:body={apiError:{code:-1,message:"Unsupported wallet test request"}};
   }
   window.postMessage({source:"FREIGHTER_EXTERNAL_MSG_RESPONSE",messagedId:packet.messageId,...body},window.location.origin);
  });
 },{authorized:options.authorized,networkPassphrase:options.networkPassphrase??testnetPassphrase,
     denyRequest:options.denyRequest??false,account:VALID_WATCH_ONLY_ACCOUNT,
     switchAddressOnAccess:options.switchAddressOnAccess??false,
     revokeAfterAccess:options.revokeAfterAccess??false,
     switchNetworkOnAccess:options.switchNetworkOnAccess??false});
}
test("previous Freighter permission restores Testnet public address without a new approval request",async({page})=>{
 await installFakeFreighter(page,{authorized:true});
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.goto("/preview/business");
 await expect(page.getByText("Freighter connected on Testnet")).toBeVisible();
 await expect(page.getByText(VALID_WATCH_ONLY_ACCOUNT).first()).toBeVisible();
 const initial=await page.evaluate(()=>(window as typeof window&{freighterRequests:string[]}).freighterRequests);
 expect(initial).toContain("REQUEST_ALLOWED_STATUS");
 expect(initial).toContain("REQUEST_PUBLIC_KEY");
 expect(initial).not.toContain("REQUEST_ACCESS");
 const button=page.getByRole("button",{name:/Transfer unavailable/});
 await expect(button).toBeDisabled();
 await page.evaluate(()=>{
  const state=window as typeof window&{mockAllowed:boolean};
  state.mockAllowed=false;
  window.dispatchEvent(new Event("focus"));
 });
 await expect(page.getByRole("alert").filter({hasText:"permission was revoked"})).toBeVisible();
 await expect(page.getByText("Freighter connected on Testnet")).toHaveCount(0);
});
test("previously approved wrong-network Freighter is rejected before public-account display",async({page})=>{
 await installFakeFreighter(page,{authorized:true,networkPassphrase:"Public Global Stellar Network ; September 2015"});
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.goto("/preview/send");
 await expect(page.getByRole("alert").filter({hasText:"wrong network"})).toBeVisible();
 await expect(page.getByText("Freighter connected on Testnet")).toHaveCount(0);
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
 expect(await page.evaluate(()=>(window as typeof window&{freighterRequests:string[]}).freighterRequests))
  .not.toContain("REQUEST_ACCESS");
});
test("Freighter manual permission denial leaves no session or transaction submission",async({page})=>{
 await installFakeFreighter(page,{authorized:false,denyRequest:true});
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.goto("/preview/business");
 await expect(page.getByText("Freighter connected on Testnet")).toHaveCount(0);
 await page.getByRole("button",{name:"Connect Freighter"}).click();
 await expect(page.getByRole("alert").filter({hasText:"Access denied by wallet."})).toBeVisible();
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
 const req=await page.evaluate(()=>(window as typeof window&{freighterRequests:string[]}).freighterRequests);
 expect(req).toContain("REQUEST_ACCESS");
 expect(req).not.toContain("SUBMIT_TRANSACTION");
 expect(req).not.toContain("SUBMIT_AUTH_ENTRY");
});


test("fresh Freighter grant is rechecked for the same account and Testnet before exposing local connection",async({page})=>{
 await installFakeFreighter(page,{authorized:false});
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.goto("/preview/business");
 await page.getByRole("button",{name:"Connect Freighter"}).click();
 await expect(page.getByText("Freighter connected on Testnet")).toBeVisible();
 const calls=await page.evaluate(()=>(window as typeof window&{freighterRequests:string[]}).freighterRequests);
 expect(calls).toContain("REQUEST_ACCESS");
 expect(calls).toContain("REQUEST_ALLOWED_STATUS");
 expect(calls).toContain("REQUEST_PUBLIC_KEY");
 expect(calls).toContain("REQUEST_NETWORK_DETAILS");
 expect(calls).not.toContain("SUBMIT_TRANSACTION");
 expect(calls).not.toContain("SUBMIT_AUTH_ENTRY");
 await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
});

for(const scenario of [
 {label:"account switch",options:{switchAddressOnAccess:true},error:/account changed during connection/},
 {label:"permission revocation",options:{revokeAfterAccess:true},error:/permission changed during connection/},
 {label:"network switch",options:{switchNetworkOnAccess:true},error:/Switch Freighter to Stellar Testnet/}
] as const){
 test("Freighter cannot commit stale manual approval after "+scenario.label,async({page})=>{
  await installFakeFreighter(page,{authorized:false,...scenario.options});
  await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
  await page.goto("/preview/send");
  await page.getByRole("button",{name:"Connect Freighter"}).click();
  await expect(page.getByRole("alert").filter({hasText:scenario.error})).toBeVisible();
  await expect(page.getByText("Freighter connected on Testnet")).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Transfer unavailable/})).toBeDisabled();
 });
}

test("read-only network states retain accessibility and visual evidence on desktop/mobile",async({page},testInfo)=>{
 const folder=testInfo.outputPath("preview-network-evidence");
 const {mkdir}=await import("node:fs/promises");
 const path=await import("node:path");
 await mkdir(folder,{recursive:true});
 const runtimeErrors:string[]=[];
 page.on("pageerror",error=>runtimeErrors.push(error.message));
 const states=[
  {state:"recovered",passphrase:testnetPassphrase,route:"business",label:"healthy-empty"},
  {state:"degraded",passphrase:testnetPassphrase,route:"send",label:"rpc-unavailable"},
  {state:"recovered",passphrase:"Public Global Stellar Network ; September 2015",route:"business",label:"wrong-network"},
 ] as const;
 for(const item of states){
  await page.unrouteAll({behavior:"wait"});
  await mockReadApi(page,{state:item.state,passphrase:item.passphrase});
  await page.goto("/preview/"+item.route);
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  await expect(page.getByRole("button",{name:/Transfer unavailable until protocol verification/})).toBeDisabled();
  await expect(page.getByText("No configured corridors yet")).toBeVisible();
  if(item.label==="healthy-empty"){
   await expect(page.getByText("Ledger 1,234").first()).toBeVisible();
   await expect(page.getByText("Dependencies connected")).toBeVisible();
  }else if(item.label==="rpc-unavailable"){
   await expect(page.getByRole("alert").filter({hasText:/network|timed out|fetch/i}).first()).toBeVisible();
   await expect(page.getByRole("button",{name:"Retry observations"})).toBeEnabled();
  }else{
   await expect(page.getByRole("alert").filter({hasText:/different Stellar network/})).toBeVisible();
  }
  // A real keyboard focus target exists even when all transfer controls are disabled.
  const search=page.getByRole("searchbox",{name:"Filter enabled corridors"});
  await search.focus();
  await expect(search).toBeFocused();
  await page.screenshot({path:path.join(folder,item.label+".png"),fullPage:true,animations:"disabled"});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 }
 // The DB outage must be distinguishable from a real empty DB response.
 await page.unrouteAll({behavior:"wait"});
 await mockReadApi(page,{state:"recovered",passphrase:testnetPassphrase});
 await page.route("**/api/bridge/v1/corridors/page**",route=>route.fulfill({
  status:503,json:{error:{code:"DEPENDENCY_UNAVAILABLE",message:"Database unavailable"},trace_id:"a".repeat(36)}
 }));
 await page.goto("/preview/send");
 await expect(page.getByRole("alert").filter({hasText:/data service|HTTP 503|unavailable/i}).first()).toBeVisible();
 await expect(page.getByRole("button",{name:/Transfer unavailable until protocol verification/})).toBeDisabled();
 await page.screenshot({path:path.join(folder,"database-unavailable.png"),fullPage:true,animations:"disabled"});
 // High-contrast and reduced-motion tablet review: public metadata remains
 // understandable without ambient animation or a mouse and never exposes a
 // transfer form. This exercise does not claim a physical-device audit.
 await page.setViewportSize({width:820,height:1180});
 await page.emulateMedia({colorScheme:"dark",reducedMotion:"reduce",forcedColors:"active"});
 await page.reload();
 await expect(page.getByRole("heading",{level:1})).toBeVisible();
 await expect(page.getByRole("button",{name:/Transfer unavailable until protocol verification/})).toBeDisabled();
 await expect(page.getByRole("searchbox",{name:"Filter enabled corridors"})).toBeVisible();
 const tabletOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(tabletOverflow).toBeLessThanOrEqual(2);
 await page.screenshot({path:path.join(folder,"tablet-high-contrast-reduced-motion.png"),
  fullPage:true,animations:"disabled"});
 expect(runtimeErrors).toEqual([]);
});
