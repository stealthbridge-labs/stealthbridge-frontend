import {expect,test} from "@playwright/test";
import {createHash,generateKeyPairSync,sign} from "node:crypto";

function stellarAddress(publicKey:Buffer){
 const data=Buffer.concat([Buffer.from([48]),publicKey]);
 let crc=0;
 for(const byte of data){
  crc^=byte<<8;
  for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;
 }
 const bytes=Buffer.concat([data,Buffer.from([crc&255,crc>>>8])]);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
 let bits=0,accumulator=0,output="";
 for(const byte of bytes){
  accumulator=(accumulator<<8)|byte;bits+=8;
  while(bits>=5){bits-=5;output+=alphabet[(accumulator>>>bits)&31];accumulator&=(1<<bits)-1;}
 }
 if(bits!==0)throw Error("Invalid Stellar StrKey fixture.");
 return output;
}
const signature=(message:string,privateKey:ReturnType<typeof generateKeyPairSync>["privateKey"])=>
 sign(null,createHash("sha256").update("Stellar Signed Message:\n"+message,"utf8").digest(),privateKey).toString("base64");
test("public stories build confidence before wallet permissions",async({page})=>{
 await page.goto("/send");
 await expect(page.getByRole("heading",{level:1,name:"Close to home. Across borders."})).toBeVisible();
 await expect(page.getByRole("link",{name:"Sign in to StealthBridge"})).toHaveAttribute("href","/login?next=/app/send");
 await expect(page.getByRole("button",{name:"Connect Freighter"})).toHaveCount(0);
 await expect(page.getByLabel("Amount")).toHaveCount(0);
 await page.goto("/business");
 await expect(page.getByRole("heading",{level:1,name:"Confidentiality means business."})).toBeVisible();
 await expect(page.getByRole("link",{name:"Sign in to StealthBridge"})).toHaveAttribute("href","/login?next=/app/business");
 await expect(page.getByRole("button",{name:"Connect Freighter"})).toHaveCount(0);
});
test("unauthenticated dashboard and payment pages are redirected to sign-in",async({page})=>{
 for(const path of ["/app","/app/send","/app/business"]){
  await page.goto(path);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading",{name:/Your world of payments/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Continue with Freighter/})).toBeVisible();
 }
 const withoutSession=await page.request.get("/api/account/directory");
 expect(withoutSession.status()).toBe(401);
 const unauthorizedProfile=await page.request.get("/api/account/profile");
 expect(unauthorizedProfile.status()).toBe(401);
 await page.getByRole("button",{name:/Continue with Freighter/}).click();
 await expect(page.locator(".access-error")).toContainText(/Freighter isn't available/);
 await expect(page.getByRole("heading",{name:"Welcome to your account."})).toHaveCount(0);
});
test("SEP-53 signed challenge creates real short-lived session; invalid proof and cross-origin fail",async({page})=>{
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const jwk=publicKey.export({format:"jwk"});
 if(typeof jwk.x!=="string")throw Error("Test key does not expose raw Ed25519 public key.");
 const address=stellarAddress(Buffer.from(jwk.x,"base64url"));
 await page.goto("/login");
 const origin=new URL(page.url()).origin;
 const reject=await page.request.post("/api/auth/challenge",{
  data:{address},headers:{origin:"https://attacker.example"}
 });
 expect(reject.status()).toBe(403);
 const result=await page.request.post("/api/auth/challenge",{data:{address},headers:{origin}});
 expect(result.status()).toBe(200);
 const data=await result.json() as {message:string;expires_at_unix:number};
 expect(data.message).toContain("Sign in to StealthBridge");
 expect(data.message).toContain("Account: "+address);
 expect(data.message).toContain("Network: Test SDF Network ; September 2015");
 expect(data.message).toContain("No transaction, payment, approval or transfer is authorized");
 const forged=await page.request.post("/api/auth/verify",{data:{address,signature:"00".repeat(64)},headers:{origin}});
 expect(forged.status()).toBe(401);
 expect(await (await page.request.get("/api/auth/session")).json()).toMatchObject({authenticated:false});
 const verified=await page.request.post("/api/auth/verify",{
  data:{address,signature:signature(data.message,privateKey)},headers:{origin}
 });
 expect(verified.status()).toBe(200);
 expect(await (await page.request.get("/api/auth/session")).json()).toMatchObject({authenticated:true,address});
 await page.route("**/api/account/directory",route=>route.fulfill({json:{
  schema_version:1,network:"testnet",source:"neon-active-memberships",
  account_address:address,organizations:[{
   id:"9a1a395f-249c-4907-b657-d48df4b38d28",
   display_name:"CI ONLY Organization",role:"viewer"
  }],has_more:false,payment_execution_enabled:false,
  organization_payment_authorized:false
 }}));
 await page.goto("/app");
 await expect(page.getByRole("heading",{name:"Welcome to your account."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Business access, in one place."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"CI ONLY Organization"})).toBeVisible();
 await expect(page.getByText("Current membership")).toBeVisible();
 await expect(page.getByRole("link",{name:/Send internationally/})).toHaveAttribute("href","/app/send");
 await page.goto("/app/send");
 await expect(page.getByRole("heading",{name:"New transfer"})).toBeVisible();
 await expect(page.getByText("Signed in securely")).toBeVisible();
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
 // The browser fixture never writes Neon. It verifies the customer intent,
 // exact preference shape and server-guarded settings journey.
 let savedProfile:{display_name:string;use_case:string;residence_country:string|null}|null=null;
 await page.route("**/api/account/profile",async route=>{
  const req=route.request();
  if(req.method()==="PATCH"){
   savedProfile=JSON.parse(req.postData()??"{}");
  }
  const profile=savedProfile?{...savedProfile,updated_at_unix:1800000000}:null;
  await route.fulfill({json:{
   schema_version:1,network:"testnet",source:"neon-customer-profiles",
   account_address:address,profile,
   payment_execution_enabled:false,organization_payment_authorized:false
  }});
 });
 await page.goto("/app/settings");
 await expect(page.getByRole("heading",{name:"Account settings."})).toBeVisible();
 await page.getByLabel("Display name").fill("Customer Test Profile");
 await page.getByLabel("What brings you to StealthBridge?").selectOption("both");
 await page.getByLabel("Country of residence (optional)").fill("NG");
 await page.getByRole("button",{name:"Save my preferences"}).click();
 await expect(page.getByText("Saved in your account")).toBeVisible();
 expect(savedProfile).toMatchObject({display_name:"Customer Test Profile",
  use_case:"both",residence_country:"NG"});
 await page.goto("/app/business");
 await expect(page.getByRole("heading",{name:"New business payment"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Submit settlement"})).toBeDisabled();
 const logout=await page.request.post("/api/auth/logout",{headers:{origin}});
 expect(logout.status()).toBe(200);
 await page.goto("/app");
 await expect(page).toHaveURL(/\/login$/);
 await expect(page.getByRole("heading",{name:"Welcome to your account."})).toHaveCount(0);
});
