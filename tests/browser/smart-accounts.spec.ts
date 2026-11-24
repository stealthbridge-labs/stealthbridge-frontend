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

// WebAuthn RP IDs must be domain names; 127.0.0.1 is rejected by browsers.
test.use({baseURL:"http://localhost:3199"});
const ACCT="CCWIDYHIDRTO44PUTS7DFLOZD3UEIAXR3YUUIIPJAB5YQH2RE346MYGT";
const FACTORY="CAUJ5FMGDISNYEU7T6EQDYRLFF7CVC5F2PXJVEHQHY7HM275I2X6ITH6";
const TX="edd014a22ac97eec5d0fe28a4ff4abf52c21b30eb4a96b95e950c9c9cfbb1815";

test("customer creates a passkey smart account; only public key material leaves the browser",async({page,context})=>{
 test.setTimeout(60_000);
 const address=await signIn(page);
 // Real WebAuthn ceremony against Chromium's virtual platform authenticator.
 const cdp=await context.newCDPSession(page);
 await cdp.send("WebAuthn.enable");
 await cdp.send("WebAuthn.addVirtualAuthenticator",{options:{protocol:"ctap2",transport:"internal",hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});

 let rows:Record<string,unknown>[]=[];let posted:Record<string,unknown>|null=null;let reads=0;
 const dir=()=>({schema_version:1,network:"testnet",account_address:address,relayer_configured:true,max_deployments:3,deployments:rows});
 await page.route("**/api/account/smart-accounts/deployments",async route=>{
  const req=route.request();
  if(req.method()==="POST"){
   posted=JSON.parse(req.postData()??"{}");
   rows=[{contract_address:ACCT,label:posted!.label,owner_public_key:posted!.public_key_hex,credential_id:posted!.credential_id,
    rp_id:"localhost",guardian_address:address,factory_address:FACTORY,tx_hash:TX,status:"submitted",ledger:null,created_at_unix:1795508616}];
   return route.fulfill({status:202,json:{network:"testnet",contract_address:ACCT,tx_hash:TX,status:"submitted",rp_id:"localhost",wallet_guardian:true}});
  }
  reads++;
  // The backend promotes a row to deployed only after observing it on-chain.
  if(rows.length&&reads>=3)rows=[{...rows[0],status:"deployed",ledger:5896996}];
  return route.fulfill({json:dir()});
 });

 await page.goto("/app/accounts");
 await expect(page.getByRole("heading",{level:1,name:"Smart accounts"})).toBeVisible();
 await expect(page.getByText("You don't have a smart account yet.")).toBeVisible();
 await page.getByLabel("Account name").fill("Travel wallet");
 await page.getByRole("button",{name:"Create with passkey"}).click();

 await expect(page.getByText("Confirming on Stellar")).toBeVisible();
 expect(posted).not.toBeNull();
 expect(Object.keys(posted!).sort()).toEqual(["credential_id","label","public_key_hex","wallet_guardian"]);
 expect(posted!.public_key_hex as string).toMatch(/^04[0-9a-f]{128}$/);
 expect(posted!.wallet_guardian).toBe(true);

 await expect(page.getByText("Active on Testnet")).toBeVisible({timeout:20_000});
 await expect(page.getByText(ACCT)).toBeVisible();
 await expect(page.getByRole("link",{name:/Transaction edd014/})).toHaveAttribute("href",`https://stellar.expert/explorer/testnet/tx/${TX}`);
 await expect(page.getByText("Passkey owner")).toBeVisible();
 await expect(page.getByText("Public on Stellar")).toBeVisible();
 const shots=process.env.STEALTHBRIDGE_SCREENSHOT_DIR;
 if(shots){
  await page.screenshot({path:`${shots}/smart-accounts-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`${shots}/smart-accounts-mobile.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
});

test("creation is honestly unavailable when the relayer is not configured",async({page})=>{
 const address=await signIn(page);
 await page.route("**/api/account/smart-accounts/deployments",route=>route.fulfill({json:{schema_version:1,network:"testnet",account_address:address,relayer_configured:false,max_deployments:3,deployments:[]}}));
 await page.goto("/app/accounts");
 await expect(page.getByText("Smart-account creation isn't switched on for this environment yet.")).toBeVisible();
 await expect(page.getByRole("button",{name:"Create with passkey"})).toBeDisabled();
});
