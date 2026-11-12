import {expect,test} from "@playwright/test";

// Explicit browser fixtures; no Testnet submission or financial data.
const first="a".repeat(64),second="b".repeat(64);
const observation=(hash:string,status="SUCCESS")=>({hash,status,ledger:123,
 latest_ledger:124,closed_at_unix:"1760000000",source:"stellar-rpc"});

test("editing a hash cancels the old lookup and permits a new lookup immediately",async({page})=>{
 let received!:()=>void,release!:()=>void;
 const started=new Promise<void>(resolve=>{received=resolve;});
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/api/bridge/v1/transactions/*",async route=>{
  const hash=route.request().url().split("/").at(-1)!;
  if(hash===first){received();await gate;}
  await route.fulfill({json:observation(hash,hash===first?"SUCCESS":"FAILED")}).catch(()=>{});
 });
 await page.goto("/explorer");
 const input=page.getByLabel("Transaction hash",{exact:true});
 await input.fill(first);
 await page.getByRole("button",{name:"Check transaction"}).click();
 await started;
 await input.fill(second);
 await expect(page.getByRole("button",{name:"Check transaction"})).toBeEnabled();
 await page.getByRole("button",{name:"Check transaction"}).click();
 await expect(page.getByRole("heading",{name:"Transaction execution failed"})).toBeVisible();
 release();
 await expect(page.locator(".tx-hex")).toHaveText(second);
 await expect(page.getByRole("heading",{name:"Included successfully on-chain"})).toHaveCount(0);
});

test("substituted transaction evidence and malformed inclusion metadata fail closed",async({page})=>{
 for(const result of [observation(second),{...observation(first),ledger:0},
  {...observation(first),closed_at_unix:""}]){
  await page.route("**/api/bridge/v1/transactions/*",route=>route.fulfill({json:result}));
  await page.goto("/explorer");
  await page.getByLabel("Transaction hash",{exact:true}).fill(first);
  await page.getByRole("button",{name:"Check transaction"}).click();
  await expect(page.getByRole("alert")).toContainText("did not match");
  await expect(page.locator(".tx-result")).toHaveCount(0);
  await page.unroute("**/api/bridge/v1/transactions/*");
 }
});
