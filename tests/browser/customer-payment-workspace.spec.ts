import {expect,test} from "@playwright/test";
import {createHash,generateKeyPairSync,sign} from "node:crypto";

function stellarAddress(publicKey:Buffer):string{
 const data=Buffer.concat([Buffer.from([48]),publicKey]);
 let crc=0;
 for(const byte of data){crc^=byte<<8;for(let i=0;i<8;i++)
  crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 const raw=Buffer.concat([data,Buffer.from([crc&255,crc>>>8])]);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
 let bits=0,acc=0,out="";
 for(const byte of raw){acc=(acc<<8)|byte;bits+=8;while(bits>=5){
  bits-=5;out+=alphabet[(acc>>>bits)&31];acc&=(1<<bits)-1;}}
 if(bits!==0)throw Error("Invalid public account fixture");
 return out;
}
async function signIn(page:import("@playwright/test").Page){
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const jwk=publicKey.export({format:"jwk"});
 if(typeof jwk.x!=="string")throw Error("Missing public key");
 const address=stellarAddress(Buffer.from(jwk.x,"base64url"));
 await page.goto("/login");const origin=new URL(page.url()).origin;
 const challenge=await page.request.post("/api/auth/challenge",{data:{address},headers:{origin}});
 expect(challenge.status()).toBe(200);
 const {message}=await challenge.json() as {message:string};
 const digest=createHash("sha256").update("Stellar Signed Message:\n"+message).digest();
 const signature=sign(null,digest,privateKey).toString("base64");
 const result=await page.request.post("/api/auth/verify",{data:{address,signature},headers:{origin}});
 expect(result.status()).toBe(200);
 return address;
}
const id="9a1a395f-249c-4907-b657-d48df4b38d28";
const recipient="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const record={id,origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
function status(){return {source:"stealthbridge-public-testnet-read",network:"testnet",
 passphrase:"Test SDF Network ; September 2015",ledger_sequence:5300000,
 ledger_closed_at_unix:String(Math.floor(Date.now()/1000)-5),
 payment_execution_enabled:false,confidential_token_verified:false,
 private_payments_verified:false,fiat_payouts_enabled:false,smart_account_deployment_verified:false};}

test("signed-in transfer verifies a classic account only on consent, and retains names locally",async({page})=>{
 await signIn(page);
 const recipientCalls:string[]=[];
 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,route=>
  route.fulfill({json:{items:[record],next_cursor:null}}));
 await page.route("**/api/public/status",route=>route.fulfill({json:status()}));
 await page.route("**/api/public/classic-recipient/**",route=>{
  recipientCalls.push(route.request().method()+" "+new URL(route.request().url()).pathname);
  return route.fulfill({json:{schema_version:1,network:"testnet",
   source:"stellar-horizon/account-presence",address:recipient,
   observed_at_unix:Math.floor(Date.now()/1000),classic_account_found:true,
   ownership_verified:false,asset_acceptance_verified:false,payment_execution_enabled:false}});
 });
 await page.goto("/app/send");
 await expect(page.getByRole("heading",{name:"New transfer"})).toBeVisible();
 await page.getByLabel("Payment route").selectOption(id);
 await page.getByLabel("Recipient Stellar wallet address").fill(recipient);
 await page.getByLabel("Recipient nickname (optional)").fill("Family");
 await page.getByLabel("Amount").fill("42.50");
 expect(recipientCalls).toEqual([]);
 await page.getByRole("button",{name:"Check recipient account"}).click();
 await expect(page.getByText(/Stellar account found on Testnet/)).toBeVisible();
 await page.getByRole("checkbox",{name:/I have checked this full address/}).check();
 await expect(page.locator(".payment-summary-card")).toContainText("Family");
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
 expect(recipientCalls).toEqual(["GET /api/public/classic-recipient/"+recipient]);
 expect(page.url()).not.toMatch(/Family|42\.50|recipient=/);
 await page.getByLabel("Recipient Stellar wallet address").fill("incorrect");
 await expect(page.getByText(/Stellar account found on Testnet/)).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Review payment details"})).toBeDisabled();
});

test("business corridor deep link renders the payment workspace, not hidden developer tools",async({page})=>{
 await signIn(page);
 await page.route(/\/api\/public\/corridors(?:\?.*)?$/,route=>
  route.fulfill({json:{items:[record],next_cursor:null}}));
 await page.route("**/api/public/status",route=>route.fulfill({json:status()}));
 await page.goto("/app/business/payments?corridor="+id);
 await expect(page.getByRole("heading",{name:"Your business, across borders."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"New business payment"})).toBeVisible();
 await expect(page.getByLabel("Payment route")).toHaveValue(id);
 await expect(page.getByText("Explore Testnet payment preparation (not yet enabled)")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Submit settlement"})).toBeDisabled();
 await expect(page.locator("main")).not.toContainText(/ledger #|database migration checks|operator_local|WASM SHA/i);
});
