import {test,expect} from "@playwright/test";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
function stellarAddress(key:Buffer):string{
 const data=Buffer.concat([Buffer.from([48]),key]);let crc=0;
 for(const b of data){crc^=b<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 const raw=Buffer.concat([data,Buffer.from([crc&255,crc>>8])]);
 const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits=0,acc=0,out="";
 for(const b of raw){acc=(acc<<8)|b;bits+=8;while(bits>=5){bits-=5;out+=abc[(acc>>>bits)&31];acc&=(1<<bits)-1;}}
 return out;
}
async function signIn(page:import("@playwright/test").Page){
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const jwk=publicKey.export({format:"jwk"});if(typeof jwk.x!=="string")throw Error("missing key");
 const address=stellarAddress(Buffer.from(jwk.x,"base64url"));
 await page.goto("/login");const origin=new URL(page.url()).origin;
 const response=await page.request.post("/api/auth/challenge",{data:{address},headers:{origin}});
 expect(response.status()).toBe(200);
 const {message}=await response.json() as {message:string};
 const signature=sign(null,createHash("sha256").update("Stellar Signed Message:\n"+message).digest(),privateKey).toString("base64");
 expect((await page.request.post("/api/auth/verify",{data:{address,signature},headers:{origin}})).status()).toBe(200);
 return address;
}
const id="9a1a395f-249c-4907-b657-d48df4b38d28";
const recipient="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const route={id,origin_country:"NG",destination_country:"GH",asset_code:"USDC",asset_issuer:null,privacy_rail:"private-payments"};
const PASS="private-test-phrase-with-at-least-fourteen-chars";
const emptyVault=(address:string,entries:unknown[])=>({schema_version:1,network:"testnet",source:"customer-ciphertext-vault",account_address:address,
 drafts:entries,payment_execution_enabled:false,plaintext_available_to_server:false});

test("signed-in customer saves and restores ciphertext only, with no automatic payment authorization",async({page})=>{
 test.setTimeout(60_000);
 const address=await signIn(page);
 let records:{id:string;revision:number;updated_at_unix:number;encrypted:unknown}[]=[];

 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,requestRoute=>requestRoute.fulfill({json:{items:[route],next_cursor:null}}));
 await page.route("**/api/public/status",route=>route.fulfill({json:{source:"stealthbridge-public-testnet-read",network:"testnet",
  passphrase:"Test SDF Network ; September 2015",ledger_sequence:5500000,ledger_closed_at_unix:String(Math.floor(Date.now()/1000)-5),
  payment_execution_enabled:false,confidential_token_verified:false,private_payments_verified:false,fiat_payouts_enabled:false,smart_account_deployment_verified:false}}));
 await page.route("**/api/account/drafts",route=>{
  const method=route.request().method();
  if(method==="GET")return route.fulfill({json:emptyVault(address,records)});
  if(method==="PUT"){
   const raw=route.request().postData()??"";
   expect(raw).not.toContain(recipient);expect(raw).not.toContain("42.50");expect(raw).not.toContain(PASS);
   const data=JSON.parse(raw) as {id:string;expected_revision:number;encrypted:unknown};
   expect(data.expected_revision).toBe(0);expect(Object.keys(data).sort()).toEqual(["encrypted","expected_revision","id"]);
   records=[{id:data.id,revision:1,updated_at_unix:Math.floor(Date.now()/1000),encrypted:data.encrypted}];
   return route.fulfill({status:204,body:""});
  }
  if(method==="DELETE"){
   records=[];return route.fulfill({status:204,body:""});
  }
  throw Error("Unexpected method "+method);
 });

 await page.goto("/app/send");
 await expect(page.getByRole("heading",{name:"Save an encrypted payment draft"})).toBeVisible();
 await page.getByLabel("Payment route").selectOption(id);
 await page.getByLabel("Recipient Stellar wallet address").fill(recipient);
 await page.getByLabel("Amount").fill("42.50");
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Save encrypted to account"}).click();
 await expect(page.getByText("Encrypted draft",{exact:true})).toBeVisible();
 expect(records).toHaveLength(1);
 await page.getByLabel("Amount").fill("87.00");
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Unlock and restore"}).click();
 await expect(page.getByLabel("Amount")).toHaveValue("42.50",{timeout:15000});
 await expect(page.getByText(/Draft restored locally/)).toBeVisible();
 await expect(page.getByRole("button",{name:"Review payment details"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
 await page.getByLabel("Vault passphrase").fill("wrong-password-that-is-long");
 await page.getByRole("button",{name:"Unlock and restore"}).click();
 await expect(page.getByText(/Unable to unlock the draft/)).toBeVisible();

});

test("customer can download encrypted draft backup without backend availability",async({page})=>{
 test.setTimeout(60_000);
 await signIn(page);
 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,requestRoute=>requestRoute.fulfill({json:{items:[route],next_cursor:null}}));
 await page.route("**/api/public/status",route=>route.fulfill({status:503,body:""}));
 await page.route("**/api/account/drafts",route=>route.fulfill({status:503,json:{code:"NOT_RELEASED"}}));
 await page.goto("/app/send");
 await page.getByLabel("Payment route").selectOption(id);
 await page.getByLabel("Recipient Stellar wallet address").fill(recipient);
 await page.getByLabel("Amount").fill("72.00");
 await page.getByLabel("Vault passphrase").fill(PASS);
 const downloadPromise=page.waitForEvent("download");
 await page.getByRole("button",{name:"Download encrypted backup"}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^stealthbridge-encrypted-[a-f0-9-]+\.json$/);
 await expect(page.getByText(/Encrypted backup created/)).toBeVisible();
 await expect(page.getByRole("button",{name:"Save encrypted to account"})).toBeDisabled();
});

test("customer updates an encrypted draft in place, rotates its passphrase and rejects concurrent overwrite",async({page})=>{
 test.setTimeout(90_000);
 const address=await signIn(page);
 const records:{id:string;revision:number;updated_at_unix:number;encrypted:unknown}[]=[];
 const previous:string[]=[];
 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,request=>request.fulfill({json:{items:[route],next_cursor:null}}));
 await page.route("**/api/public/status",request=>request.fulfill({status:503,body:""}));
 await page.route("**/api/account/drafts",request=>{
  const method=request.request().method();
  if(method==="GET")return request.fulfill({json:emptyVault(address,records)});
  if(method!=="PUT")throw Error("unexpected vault method "+method);
  const raw=request.request().postData()??"";
  for(const secret of [PASS,"private-rotated-phrase-on-another-device"]){
   expect(raw).not.toContain(secret);
  }
  expect(raw).not.toContain(recipient);
  const data=JSON.parse(raw) as {id:string;expected_revision:number;encrypted:unknown};
  const current=records.find(record=>record.id===data.id);
  if(data.expected_revision!==(current?.revision??0))
   return request.fulfill({status:409,json:{code:"CONCURRENT_DRAFT_CHANGE"}});
  previous.push(JSON.stringify(current?.encrypted??null));
  const next={id:data.id,revision:data.expected_revision+1,
   updated_at_unix:Math.floor(Date.now()/1000),encrypted:data.encrypted};
  if(current)records.splice(records.indexOf(current),1,next);else records.push(next);
  return request.fulfill({status:204,body:""});
 });
 await page.goto("/app/send");
 await page.getByLabel("Payment route").selectOption(id);
 await page.getByLabel("Recipient Stellar wallet address").fill(recipient);
 await page.getByLabel("Amount").fill("42.50");
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Save encrypted to account"}).click();
 await expect(page.getByRole("button",{name:"Update saved encrypted draft"})).toBeEnabled();
 expect(records).toHaveLength(1);expect(records[0].revision).toBe(1);
 const previousId=records[0].id;
 await page.getByLabel("Amount").fill("51.25");
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Update saved encrypted draft"}).click();
 await expect(page.getByText(/Encrypted draft updated safely/)).toBeVisible();
 expect(records).toHaveLength(1);expect(records[0].id).toBe(previousId);
 expect(records[0].revision).toBe(2);
 expect(JSON.stringify(records[0].encrypted)).not.toBe(previous[1]);
 await page.getByLabel("Amount").fill("99.00");
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Unlock and restore"}).click();
 await expect(page.getByLabel("Amount")).toHaveValue("51.25");
 await expect(page.getByRole("button",{name:"Review payment details"})).toBeDisabled();
 await page.getByLabel("Vault passphrase").fill("wrong-old-passphrase-rejected");
 await page.getByLabel("New passphrase",{exact:true}).fill("private-rotated-phrase-on-another-device");
 await page.getByLabel("Confirm new passphrase").fill("private-rotated-phrase-on-another-device");
 await page.getByRole("button",{name:"Change draft passphrase"}).click();
 await expect(page.getByText(/Unable to unlock the draft/)).toBeVisible();
 expect(records[0].revision).toBe(2);
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Change draft passphrase"}).click();
 await expect(page.getByText(/Vault passphrase changed/)).toBeVisible();
 expect(records).toHaveLength(1);expect(records[0].revision).toBe(3);
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Unlock and restore"}).click();
 await expect(page.getByText(/Unable to unlock the draft/)).toBeVisible();
 await page.getByLabel("Vault passphrase").fill("private-rotated-phrase-on-another-device");
 await page.getByRole("button",{name:"Unlock and restore"}).click();
 await expect(page.getByText(/Draft restored locally/)).toBeVisible();
 await expect(page.getByLabel("Amount")).toHaveValue("51.25");
 // Represent another device winning the update race. The first device must
 // not be able to overwrite it with its previously witnessed revision 3.
 records[0].revision=4;
 await page.getByLabel("Amount").fill("60.00");
 await page.getByLabel("Vault passphrase").fill("private-rotated-phrase-on-another-device");
 await page.getByRole("button",{name:"Update saved encrypted draft"}).click();
 await expect(page.getByText(/Draft changed on another device/)).toBeVisible();
 expect(records[0].revision).toBe(4);
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
});

test("encrypted backup can be imported after a fresh page load and explicitly synced to a new slot",async({page})=>{
 test.setTimeout(90_000);
 const address=await signIn(page);
 const records:{id:string;revision:number;updated_at_unix:number;encrypted:unknown}[]=[];
 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,request=>request.fulfill({json:{items:[route],next_cursor:null}}));
 await page.route("**/api/public/status",request=>request.fulfill({status:503,body:""}));
 await page.route("**/api/account/drafts",request=>{
  if(request.request().method()==="GET")return request.fulfill({json:emptyVault(address,records)});
  const raw=request.request().postData()??"";
  expect(raw).not.toContain(recipient);
  expect(raw).not.toContain(PASS);
  expect(raw).not.toContain("73.00");
  const data=JSON.parse(raw) as {id:string;expected_revision:number;encrypted:unknown};
  if(data.expected_revision!==0||records.some(item=>item.id===data.id))
   return request.fulfill({status:409,json:{code:"DUPLICATE"}});
  records.push({id:data.id,revision:1,updated_at_unix:Math.floor(Date.now()/1000),encrypted:data.encrypted});
  return request.fulfill({status:204,body:""});
 });
 await page.goto("/app/send");
 await page.getByLabel("Payment route").selectOption(id);
 await page.getByLabel("Recipient Stellar wallet address").fill(recipient);
 await page.getByLabel("Amount").fill("73.00");
 await page.getByLabel("Vault passphrase").fill(PASS);
 const downloading=page.waitForEvent("download");
 await page.getByRole("button",{name:"Download encrypted backup"}).click();
 const downloaded=await downloading;
 const {readFile}=await import("node:fs/promises");
 const blob=await readFile(await downloaded.path());
 expect(blob.toString()).not.toContain(recipient);
 expect(blob.toString()).not.toContain("73.00");
 await page.reload();
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.locator("#customer-vault-file").setInputFiles({name:"encrypted-backup.json",mimeType:"application/json",buffer:blob});
 await expect(page.getByLabel("Amount")).toHaveValue("73.00");
 await expect(page.getByRole("button",{name:"Save backup as new encrypted draft"})).toBeEnabled();
 await page.getByLabel("Vault passphrase").fill(PASS);
 await page.getByRole("button",{name:"Save backup as new encrypted draft"}).click();
 await expect(page.getByText(/Encrypted draft saved to your account/)).toBeVisible();
 expect(records).toHaveLength(1);
 const archived=JSON.parse(blob.toString()) as {id:string};
 expect(records[0].id).not.toBe(archived.id);
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
});
