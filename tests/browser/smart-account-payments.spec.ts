import {test,expect} from "@playwright/test";
import {createHash,createVerify,generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
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

// WebAuthn RP IDs must be domain names.
test.use({baseURL:"http://localhost:3199"});
const ACCOUNT="CAUJ5FMGDISNYEU7T6EQDYRLFF7CVC5F2PXJVEHQHY7HM275I2X6ITH6";
const DEST="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const TX="b".repeat(64);
// Authorization preimage produced by the Rust backend for exactly
// ACCOUNT -> DEST, 12.5 XLM, Testnet, expiry ledger 1000.
const PREIMAGE=readFileSync(`${process.cwd()}/tests/fixtures/payment-preimage.b64`,"utf8").trim();
const CHALLENGE=createHash("sha256").update(Buffer.from(PREIMAGE,"base64")).digest("base64url");
const CRED_ID=Buffer.from("stealthbridge-e2e-cred-0001").toString("base64url");

async function setup(page:import("@playwright/test").Page,context:import("@playwright/test").BrowserContext){
 const address=await signIn(page);
 const cdp=await context.newCDPSession(page);
 await cdp.send("WebAuthn.enable");
 const {authenticatorId}=await cdp.send("WebAuthn.addVirtualAuthenticator",{options:{protocol:"ctap2",transport:"internal",hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 const {privateKey,publicKey}=generateKeyPairSync("ec",{namedCurve:"P-256"});
 await cdp.send("WebAuthn.addCredential",{authenticatorId,credential:{credentialId:Buffer.from("stealthbridge-e2e-cred-0001").toString("base64"),isResidentCredential:true,rpId:"localhost",userHandle:Buffer.from("stealthbridge-user-handle-01").toString("base64"),privateKey:privateKey.export({format:"der",type:"pkcs8"}).toString("base64"),signCount:0}});
 const pub=publicKey.export({format:"der",type:"spki"}).subarray(26).toString("hex");
 const deployment={contract_address:ACCOUNT,label:"Everyday",owner_public_key:pub,credential_id:CRED_ID,rp_id:"localhost",guardian_address:address,
  factory_address:"CAUJ5FMGDISNYEU7T6EQDYRLFF7CVC5F2PXJVEHQHY7HM275I2X6ITH6",tx_hash:"a".repeat(64),status:"deployed",ledger:5896996,created_at_unix:1795508616};
 await page.route("**/api/account/smart-accounts/deployments",r=>r.fulfill({json:{schema_version:1,network:"testnet",account_address:address,relayer_configured:true,max_deployments:3,deployments:[deployment]}}));
 await page.route("**/api/account/smart-accounts/balances",r=>r.fulfill({json:{schema_version:1,account_address:address,accounts:[{contract_address:ACCOUNT,balances:[{asset:"XLM",balance_stroops:"1000000000"}]}]}}));
 return {address,publicKey};
}

const prepared=(over={})=>({id:"6f0b6f1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",status:"prepared",contract_address:ACCOUNT,destination:DEST,asset:"XLM",
 asset_contract:"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",amount_stroops:125_000_000,network_passphrase:"Test SDF Network ; September 2015",
 expiration_ledger:1000,fee_estimate_stroops:95000,fee_payer:"stealthbridge-relayer",authorization_preimage_xdr:PREIMAGE,challenge:CHALLENGE,credential_id:CRED_ID,rp_id:"localhost",...over});

test("passkey approves the exact reviewed payment and the UI waits for chain confirmation",async({page,context})=>{
 test.setTimeout(60_000);
 const {address,publicKey}=await setup(page,context);
 let submitted:Record<string,string>|null=null;let payments:Record<string,unknown>[]=[];let reads=0;
 await page.route("**/api/account/smart-accounts/payments",async route=>{
  const req=route.request();
  if(req.method()==="GET"){
   reads++;
   if(payments.length&&reads>=3)payments=[{...payments[0],status:"confirmed",ledger:5900001}];
   return route.fulfill({json:{schema_version:1,account_address:address,payments_configured:true,assets:["XLM"],payments}});
  }
  const body=JSON.parse(req.postData()??"{}");
  if(body.action==="prepare"){
   expect(body).toEqual({action:"prepare",contract_address:ACCOUNT,destination:DEST,asset:"XLM",amount_stroops:125_000_000});
   return route.fulfill({status:201,json:prepared()});
  }
  submitted=body;
  payments=[{id:body.id,contract_address:ACCOUNT,destination:DEST,asset:"XLM",asset_contract:"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
   amount_stroops:125_000_000,status:"submitted",tx_hash:TX,ledger:null,fee_estimate_stroops:95000,error_code:null,created_at_unix:1795600000}];
  return route.fulfill({status:202,json:{id:body.id,status:"submitted",tx_hash:TX}});
 });

 await page.goto("/app/send");
 await expect(page.getByRole("heading",{level:1,name:"Send money"})).toBeVisible();
 await expect(page.getByText("Available: 100 XLM")).toBeVisible();
 await page.getByLabel("Recipient Stellar address").fill(DEST);
 await page.getByLabel("Amount to send").fill("12.5");
 await page.getByRole("button",{name:"Continue to review"}).click();
 await expect(page.getByRole("heading",{name:"Review and approve"})).toBeVisible();
 await expect(page.getByText("12.5 XLM")).toBeVisible();
 await expect(page.getByText("This is a standard Stellar payment, not a confidential one.",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"Approve with passkey"}).click();
 await expect(page.getByRole("heading",{name:"Payment confirmed"})).toBeVisible({timeout:20_000});
 await expect(page.getByText("Included in ledger 5,900,001")).toBeVisible();

 // The submitted assertion is a real P-256 signature over exactly the challenge.
 expect(submitted).not.toBeNull();
 const ad=Buffer.from(submitted!.authenticator_data,"base64url");
 const cd=Buffer.from(submitted!.client_data_json,"base64url");
 const client=JSON.parse(cd.toString()) as {type:string;challenge:string};
 expect(client.type).toBe("webauthn.get");
 expect(client.challenge).toBe(CHALLENGE);
 expect(ad[32]&0x05).toBe(0x05);
 const v=createVerify("SHA256");v.update(Buffer.concat([ad,createHash("sha256").update(cd).digest()]));
 expect(v.verify(publicKey,Buffer.from(submitted!.signature,"base64url"))).toBe(true);

 const shots=process.env.STEALTHBRIDGE_SCREENSHOT_DIR;
 if(shots){await page.screenshot({path:`${shots}/send-confirmed-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${shots}/send-confirmed-mobile.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
});

test("a compromised backend cannot get the passkey to sign a different recipient",async({page,context})=>{
 const {address}=await setup(page,context);
 let submits=0;
 await page.route("**/api/account/smart-accounts/payments",async route=>{
  const req=route.request();
  if(req.method()==="GET")return route.fulfill({json:{schema_version:1,account_address:address,payments_configured:true,assets:["XLM"],payments:[]}});
  const body=JSON.parse(req.postData()??"{}");
  if(body.action==="submit"){submits++;return route.fulfill({status:202,json:{tx_hash:TX}});}
  // The customer typed OTHER, but the server returns an authorization for DEST.
  return route.fulfill({status:201,json:prepared({destination:body.destination})});
 });
 await page.goto("/app/send");
 await page.getByLabel("Recipient Stellar address").fill("GBXXE7JVT6JPUOLBYZM4ECD63DUVGGPJZXYMVVLUZT42GFPHXG3UEARH");
 await page.getByLabel("Amount to send").fill("12.5");
 await page.getByRole("button",{name:"Continue to review"}).click();
 await page.getByRole("button",{name:"Approve with passkey"}).click();
 await expect(page.getByText("The authorization does not match the payment you reviewed.")).toBeVisible();
 expect(submits).toBe(0);
});

test("cancelling the passkey prompt sends nothing",async({page,context})=>{
 const {address}=await setup(page,context);
 let submits=0;
 await page.route("**/api/account/smart-accounts/payments",async route=>{
  const req=route.request();
  if(req.method()==="GET")return route.fulfill({json:{schema_version:1,account_address:address,payments_configured:true,assets:["XLM"],payments:[]}});
  const body=JSON.parse(req.postData()??"{}");
  if(body.action==="submit"){submits++;return route.fulfill({status:202,json:{tx_hash:TX}});}
  return route.fulfill({status:201,json:prepared({credential_id:Buffer.from("unknown-credential-id-00").toString("base64url")})});
 });
 await page.goto("/app/send");
 await page.getByLabel("Recipient Stellar address").fill(DEST);
 await page.getByLabel("Amount to send").fill("12.5");
 await page.getByRole("button",{name:"Continue to review"}).click();
 await page.getByRole("button",{name:"Approve with passkey"}).click();
 await expect(page.getByText(/Passkey approval was cancelled\. Nothing was sent\.|cancelled/).first()).toBeVisible({timeout:20_000});
 expect(submits).toBe(0);
});
