import {test,expect} from "@playwright/test";
import {signIn} from "./instruction-auth-helper";
const id="a12ef783-d60b-4427-aa62-d2562acd4cef";
const recipient="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const corridor={id,origin_country:"NG",destination_country:"GB",asset_code:"USDC",asset_issuer:null,privacy_rail:"private-payments"};
const password="test-only-instruction-password";
test("authenticated customer creates ciphertext, unlocks it after navigation and cancels with confirmation",async({page},testInfo)=>{
 const address=await signIn(page);let record:Record<string,unknown>|null=null;const writes:string[]=[];
 const now=()=>Math.floor(Date.now()/1000);
 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,r=>r.fulfill({json:{items:[corridor],next_cursor:null}}));
 await page.route("**/api/public/corridors/"+id,r=>r.fulfill({json:corridor}));
 await page.route("**/api/public/corridors/"+id+"/preflight",r=>r.fulfill({json:{
  schema_version:1,network:"testnet",source:"live-corridor-metadata-preflight",observed_at_unix:now(),corridor,network_fresh:true,ledger_sequence:5300000,
  database_schema_ready:true,read_only_dependencies_ready:true,payment_execution_enabled:false,fee_quote_available:false,liquidity_verified:false,issuer_verified:false,privacy_verified:false,fiat_payouts_enabled:false}}));
 await page.route("**/api/public/status",r=>r.fulfill({json:{source:"stealthbridge-public-testnet-read",network:"testnet",passphrase:"Test SDF Network ; September 2015",
  ledger_sequence:5300000,ledger_closed_at_unix:String(now()-5),payment_execution_enabled:false,confidential_token_verified:false,private_payments_verified:false,fiat_payouts_enabled:false,smart_account_deployment_verified:false}}));
 await page.route("**/api/public/classic-recipient/**",r=>r.fulfill({json:{schema_version:1,network:"testnet",source:"stellar-horizon/account-presence",address:recipient,
  observed_at_unix:now(),classic_account_found:true,ownership_verified:false,asset_acceptance_verified:false,payment_execution_enabled:false}}));
 await page.route("**/api/account/instructions",r=>{
  const method=r.request().method();
  if(method==="GET")return r.fulfill({json:{schema_version:1,network:"testnet",source:"customer-payment-instructions",account_address:address,observed_at_unix:now(),
   items:record?[record]:[],payment_execution_enabled:false,plaintext_available_to_server:false}});
  const raw=r.request().postData()??"";writes.push(method);
  for(const secret of [recipient,"42.50",password])expect(raw).not.toContain(secret);
  const data=JSON.parse(raw) as Record<string,unknown>;
  if(method==="PUT"){
   expect(Object.keys(data).sort()).toEqual(["corridor_id","encrypted","expires_in_seconds","id","route_fingerprint"]);
   record={id:data.id,corridor_id:data.corridor_id,route_fingerprint:data.route_fingerprint,encrypted:data.encrypted,state:"saved",revision:1,created_at_unix:now(),expires_at_unix:now()+Number(data.expires_in_seconds),cancelled_at_unix:null};
  }else{
   expect(method).toBe("POST");expect(data.expected_revision).toBe(1);expect(record).not.toBeNull();
   record={...record,state:"cancelled",revision:2,cancelled_at_unix:now()};
  }
  return r.fulfill({status:204});
 });
 await page.goto("/app/send");
 await page.getByLabel("Payment route").selectOption(id);await page.getByLabel("Recipient Stellar wallet address").fill(recipient);await page.getByLabel("Amount",{exact:true}).fill("42.50");
 await page.getByRole("button",{name:"Check recipient account"}).click();
 await page.getByRole("checkbox",{name:/I have checked this full address/}).check();
 await page.getByRole("button",{name:"Review payment details"}).click();
 await expect(page.getByText("Private local review fingerprint")).toBeVisible();
 await page.getByLabel("Instruction passphrase").fill(password);await page.getByRole("button",{name:"Save payment instruction",exact:true}).click();
 await expect(page.getByText(/Encrypted instruction saved to your account/)).toBeVisible();
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
 await page.goto("/app/instructions");await page.getByLabel("Instruction passphrase").fill(password);
 await page.getByRole("button",{name:"Unlock details"}).click();await expect(page.getByText("Unlocked on this device")).toBeVisible();
 await expect(page.locator(".instruction-details")).toContainText("42.50");
 await page.getByRole("button",{name:"Cancel instruction",exact:true}).click();
 await expect(page.getByRole("group",{name:"Confirm instruction cancellation"})).toBeVisible();
 await page.getByRole("button",{name:"Confirm cancellation"}).click();
 await expect(page.locator(".instruction-state")).toHaveText("cancelled");
 expect(writes).toEqual(["PUT","POST"]);
 await page.screenshot({path:testInfo.outputPath("encrypted-instruction-cancelled.png"),fullPage:true});
});
test("instruction API rejects signed-out identity claims and cross-origin writes",async({page})=>{
 expect((await page.request.get("/api/account/instructions",{headers:{"x-stealthbridge-account":recipient}})).status()).toBe(401);
 await signIn(page);
 expect((await page.request.post("/api/account/instructions",{headers:{origin:"https://attacker.example"},data:{id,expected_revision:1}})).status()).toBe(403);
});
