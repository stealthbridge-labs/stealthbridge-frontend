import {expect,test} from "@playwright/test";

const CONTRACT="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const ONE="0000000000000000100-0000000001";
const TWO="0000000000000000101-0000000001";
const now=()=>String(Math.floor(Date.now()/1000)-9);
const contract={contract_id:CONTRACT,next_start_ledger:102,observed_at_unix:now()};
const event=(id:string,hash:string,ledger:number)=>({
 id,contract_id:CONTRACT,tx_hash:hash.repeat(64),ledger_sequence:ledger,
 observed_at_unix:now()
});
const activity=(items:ReturnType<typeof event>[],cursor:string|null,status:"checkpoint-present"|"no-checkpoint"="checkpoint-present")=>({
 network:"testnet",source:"stored-public-testnet-metadata",
 observation_status:status,payment_execution_enabled:false,
 contracts:status==="no-checkpoint"?[]:[contract],items,next_cursor:cursor
});
const ledger=()=>({
 network:"testnet",passphrase:"Test SDF Network ; September 2015",
 protocol_version:27,ledger_sequence:145900,ledger_hash:"c".repeat(64),
 ledger_closed_at_unix:now(),source:"stellar-rpc"
});
test("honest missing checkpoint renders accessible empty state, not a forged transfer",async({page},testInfo)=>{
 const requests:string[]=[];
 await page.route("**/api/bridge/**",route=>{
  requests.push(route.request().method()+" "+new URL(route.request().url()).pathname);
  return route.fulfill({json:new URL(route.request().url()).pathname.endsWith("/v1/network")?
   ledger():activity([],null,"no-checkpoint")});
 });
 await page.goto("/preview/activity");
 await expect(page.getByRole("heading",{level:1,name:"Testnet Activity"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"No observer checkpoint configured"})).toBeVisible();
 await expect(page.getByText("Financial execution",{exact:true})).toBeVisible();
 await expect(page.getByText("Disabled",{exact:true})).toBeVisible();
 expect(requests).toEqual(expect.arrayContaining([
  "GET /api/bridge/v1/observer/activity","GET /api/bridge/v1/network"
 ]));
 expect(requests.every(r=>r.startsWith("GET "))).toBe(true);
 await page.screenshot({path:testInfo.outputPath("testnet-activity-empty.png"),fullPage:true,animations:"disabled"});
});
test("public history supports stable older-page loads and filtered contract identity",async({page},testInfo)=>{
 const seen:string[]=[];
 await page.route("**/api/bridge/**",route=>{
  const url=new URL(route.request().url());
  seen.push(url.pathname+url.search);
  if(url.pathname.endsWith("/v1/network"))return route.fulfill({json:ledger()});
  const before=url.searchParams.get("before");
  // A page advertises a next cursor only when it fills the requested limit.
  // Show 10 genuinely distinct, synthetic PUBLIC event IDs for this fixture.
  const first=Array.from({length:10},(_,index)=>{
   const ledger=110-index;
   const id=String(ledger).padStart(19,"0")+"-0000000001";
   return event(id,"b",ledger);
  });
  const items=before?[event(ONE,"a",100)]:first;
  const cursor=before?null:first.at(-1)!.id+"."+CONTRACT;
  return route.fulfill({json:activity(items,cursor)});
 });
 await page.goto("/preview/activity");
 await expect(page.getByRole("heading",{name:/Contract event/})).toHaveCount(10);
 await expect(page.getByText(TWO,{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:/Load older public events/})).toBeEnabled();
 await page.getByRole("button",{name:/Load older public events/}).click();
 await expect(page.getByRole("heading",{name:/Contract event/})).toHaveCount(11);
 await expect(page.getByRole("button",{name:/Load older public events/})).toHaveCount(0);
 await expect(page.getByText(ONE,{exact:true})).toBeVisible();
 await expect(page.getByText("No observer checkpoint configured")).toHaveCount(0);
 await expect(page.getByRole("link",{name:/Inspect public Testnet transaction/})).toHaveCount(11);
 const control=page.getByLabel("Observed contract");
 await control.selectOption(CONTRACT);
 await expect(page.getByRole("heading",{name:/Contract event/})).toHaveCount(10);
 expect(seen.some(s=>s.includes("before="+String(101).padStart(19,"0")+"-0000000001."+CONTRACT))).toBe(true);
 expect(seen.some(s=>s.includes("contract_id="+CONTRACT))).toBe(true);
 await page.screenshot({path:testInfo.outputPath("testnet-activity-with-public-events.png"),fullPage:true,animations:"disabled"});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});
test("forged confidential payment readiness or private XDR is rejected",async({page})=>{
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/v1/network"))return route.fulfill({json:ledger()});
  return route.fulfill({json:{...activity([event(TWO,"b",101)],null),
   payment_execution_enabled:true}});
 });
 await page.goto("/preview/activity");
 await expect(page.getByRole("alert").filter({hasText:"malformed"})).toBeVisible();
 await expect(page.getByText(TWO,{exact:true})).toHaveCount(0);
 await expect(page.getByText("Financial execution")).toBeVisible();
 await expect(page.getByText("Disabled",{exact:true})).toBeVisible();
});
test("database errors remain unavailable rather than misreported as no events",async({page})=>{
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/v1/network"))return route.fulfill({json:ledger()});
  return route.fulfill({status:503,json:{error:{code:"DEPENDENCY_UNAVAILABLE"}}});
 });
 await page.goto("/preview/activity");
 await expect(page.getByRole("alert").filter({hasText:"HTTP 503"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"No observer checkpoint configured"})).toHaveCount(0);
});
test("proxy refuses malformed and duplicated activity parameters before backend access",async({request})=>{
 for(const query of [
  "?limit=0","?limit=26","?limit=2&limit=3",
  "?contract_id=CAAAAA","?before=../../health","?other=foo",
  "?before="+TWO+"."+CONTRACT+"&contract_id=CAAAAA",
 ]){
  const res=await request.get("/api/bridge/v1/observer/activity"+query);
  expect(res.status(),query).toBe(400);
 }
 const write=await request.post("/api/bridge/v1/observer/activity",{data:{}});
 expect([404,405]).toContain(write.status());
});

test("migration-gated activity shows actual schema status without fabricated events",async({page})=>{
 const calls:string[]=[];
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  calls.push(route.request().method()+" "+path);
  if(path.endsWith("/v1/network"))return route.fulfill({json:ledger()});
  if(path.endsWith("/v1/observer/schema"))return route.fulfill({json:{
   schema_version:1,network:"testnet",source:"postgresql-sqlx-migrations",
   schema_status:"migrations-pending",registered_migrations:7,required_migrations:10,
   payment_execution_enabled:false,fee_collection_enabled:false
  }});
  return route.fulfill({status:503,json:{error:{code:"DEPENDENCY_UNAVAILABLE"}}});
 });
 await page.goto("/preview/activity");
 await expect(page.getByRole("alert").filter({hasText:"HTTP 503"})).toBeVisible();
 await expect(page.getByText(/Observer journal schema migrations pending: 7 of 10/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"No observer checkpoint configured"})).toHaveCount(0);
 expect(calls).toContain("GET /api/bridge/v1/observer/schema");
 expect(calls.every(c=>c.startsWith("GET "))).toBe(true);
});
test("forged observer schema readiness is never surfaced as genuine",async({page})=>{
 await page.route("**/api/bridge/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/v1/network"))return route.fulfill({json:ledger()});
  if(path.endsWith("/v1/observer/schema"))return route.fulfill({json:{
   schema_version:1,network:"testnet",source:"postgresql-sqlx-migrations",
   schema_status:"current",registered_migrations:7,required_migrations:10,
   payment_execution_enabled:true,fee_collection_enabled:false
  }});
  return route.fulfill({status:503,json:{error:{code:"DEPENDENCY_UNAVAILABLE"}}});
 });
 await page.goto("/preview/activity");
 await expect(page.getByRole("alert").filter({hasText:"HTTP 503"})).toBeVisible();
 await expect(page.getByText(/Observer journal schema migrations pending/)).toHaveCount(0);
 await expect(page.getByRole("heading",{name:"No observer checkpoint configured"})).toHaveCount(0);
});
