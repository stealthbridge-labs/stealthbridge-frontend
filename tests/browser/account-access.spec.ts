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
 const unauthorizedBusiness=await page.request.get("/api/account/business-onboarding");
 expect(unauthorizedBusiness.status()).toBe(401);
 const unauthorizedInvites=await page.request.get("/api/account/team-invites");
 expect(unauthorizedInvites.status()).toBe(401);
 const unauthorizedInviteWrite=await page.request.post("/api/account/team-invites",{
  data:{action:"accept",invitation_id:"9a1a395f-249c-4907-b657-d48df4b38d28"}
 });
 expect(unauthorizedInviteWrite.status()).toBe(401);
 const unauthorizedAmend=await page.request.patch("/api/account/business-onboarding",{
  data:{organization_id:"9a1a395f-249c-4907-b657-d48df4b38d28",
   expected_display_name:"Old",display_name:"New"}
 });
 expect(unauthorizedAmend.status()).toBe(401);
 const unauthorizedWithdraw=await page.request.delete("/api/account/business-onboarding",{
  data:{organization_id:"9a1a395f-249c-4907-b657-d48df4b38d28",
   confirm_display_name:"Old"}
 });
 expect(unauthorizedWithdraw.status()).toBe(401);
 const unauthorizedTeam=await page.request.get("/api/account/organizations/9a1a395f-249c-4907-b657-d48df4b38d28/team");
 expect(unauthorizedTeam.status()).toBe(401);
 await page.goto("/app/business/9a1a395f-249c-4907-b657-d48df4b38d28");
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
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
 let acceptedInvite=false;
 const inviteId="b3a295f4-0a37-4da4-94c2-38f2f0ee5729";
 await page.route("**/api/account/team-invites",async route=>{
  const method=route.request().method();
  if(method==="POST"){
   expect(route.request().postDataJSON()).toEqual({action:"accept",invitation_id:inviteId});
   acceptedInvite=true;
   await route.fulfill({status:204,body:""});
   return;
  }
  await route.fulfill({json:{
   schema_version:1,network:"testnet",source:"neon-team-invitations",
   account_address:address,
   received:acceptedInvite?[]:[{
    id:inviteId,organization_id:"781bbea7-19bf-410b-ad7b-95357d8bbd13",
    organization_name:"Invitation Test Only",
    peer_address:"GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX",
    role:"viewer",status:"pending",created_at_unix:1800000000,expires_at_unix:1800604800
   }],sent:[],received_more:false,sent_more:false,
   business_verified:false,payment_execution_enabled:false,
   organization_payment_authorized:false
  }});
 });
 await page.goto("/app");
 await expect(page.getByRole("heading",{name:"Welcome to your account."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Invitations for you"})).toBeVisible();
 await expect(page.getByText("Invitation Test Only")).toBeVisible();
 await page.getByRole("button",{name:"Accept viewer invitation"}).click();
 await expect(page.getByText("You have no pending invitations for this account.")).toBeVisible();
 expect(acceptedInvite).toBe(true);
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
 // A browser test can exercise UX with isolated API fixtures; it must never
 // create a real organization in Neon or claim a fictitious customer in prod.
 let application:{id:string;display_name:string;status:"pending";role:"owner"}|null=null;
 await page.route("**/api/account/business-onboarding",async route=>{
  const request=route.request();
  if(request.method()==="POST"){
   const posted=request.postDataJSON() as {display_name:string};
   application={id:"9a1a395f-249c-4907-b657-d48df4b38d28",
    display_name:posted.display_name,status:"pending",role:"owner"};
  }
  if(request.method()==="PATCH"){
   const posted=request.postDataJSON() as {organization_id:string;expected_display_name:string;display_name:string};
   expect(posted.organization_id).toBe("9a1a395f-249c-4907-b657-d48df4b38d28");
   expect(posted.expected_display_name).toBe(application?.display_name);
   if(application)application={...application,display_name:posted.display_name};
  }
  if(request.method()==="DELETE"){
   const posted=request.postDataJSON() as {organization_id:string;confirm_display_name:string};
   expect(posted.organization_id).toBe("9a1a395f-249c-4907-b657-d48df4b38d28");
   expect(posted.confirm_display_name).toBe(application?.display_name);
   application=null;
  }
  await route.fulfill({status:request.method()==="POST"?201:200,json:{
   schema_version:1,network:"testnet",source:"neon-pending-business-applications",
   account_address:address,applications:application?[application]:[],
   has_more:false,organization_verified:false,payment_execution_enabled:false,
   organization_payment_authorized:false
  }});
 });
 await page.goto("/app/business");
 await expect(page.getByRole("heading",{name:"Where your business goes further."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Build your business space."})).toBeVisible();
 await page.getByLabel("Business or organization name").fill("Browser Test Only Ltd");
 await page.getByRole("button",{name:"Register business application"}).click();
 await expect(page.getByRole("heading",{name:"Browser Test Only Ltd"})).toBeVisible();
 await expect(page.getByText("Pending onboarding")).toBeVisible();
 await expect(page.getByText(/do not establish legal identity/)).toBeVisible();
 await page.getByRole("button",{name:"Correct application name"}).click();
 await page.getByLabel("Correct organization name").fill("Browser Corrected Ltd");
 await page.getByRole("button",{name:"Save corrected name"}).click();
 await expect(page.getByRole("heading",{name:"Browser Corrected Ltd"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Browser Test Only Ltd"})).toHaveCount(0);

 await page.route("**/api/account/organizations/*/team",route=>route.fulfill({json:{
  schema_version:1,network:"testnet",source:"neon-organization-team",
  account_address:address,
  organization:{id:"9a1a395f-249c-4907-b657-d48df4b38d28",
   display_name:"Browser Corrected Ltd",status:"pending",your_role:"owner"},
  members:[{account_address:address,role:"owner",joined_at_unix:1800000000}],
  next_cursor:null,business_verified:false,invitation_issuance_enabled:false,
  payment_execution_enabled:false,organization_payment_authorized:false
 }}));
 await page.getByRole("link",{name:"Review application and team"}).click();
 await expect(page.getByRole("heading",{name:"People, roles, and progress."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Browser Corrected Ltd"})).toBeVisible();
 await expect(page.getByText("Application pending")).toBeVisible();
 await expect(page.getByText("Team invitations",{exact:true})).toBeVisible();
 await expect(page.getByText(/Transfers, settlement, fiat payouts and platform fee claims remain disabled/)).toBeVisible();
 await expect(page.getByRole("button",{name:/Invite|Submit settlement|Approve payment/})).toHaveCount(0);
 await page.goto("/app/business");
 await expect(page.getByRole("heading",{name:"Where your business goes further."})).toBeVisible();
 await page.getByRole("button",{name:"Withdraw",exact:true}).click();
 await expect(page.getByText(/Permanent withdrawal/)).toBeVisible();
 await expect(page.getByRole("button",{name:"Permanently withdraw application"})).toBeDisabled();
 await page.getByLabel("Type the exact application name to confirm").fill("Browser Corrected Ltd");
 await page.getByRole("button",{name:"Permanently withdraw application"}).click();
 await expect(page.getByText(/haven't registered a business workspace yet/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"Browser Corrected Ltd"})).toHaveCount(0);
 await page.getByText("Explore Testnet payment preparation (not yet enabled)").click();
 await expect(page.getByRole("heading",{name:"New business payment"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Submit settlement"})).toBeDisabled();
 const logout=await page.request.post("/api/auth/logout",{headers:{origin}});
 expect(logout.status()).toBe(200);
 await page.goto("/app");
 await expect(page).toHaveURL(/\/login$/);
 await expect(page.getByRole("heading",{name:"Welcome to your account."})).toHaveCount(0);
});

test("active owner can invite and revoke a viewer, without finance permissions",async({page})=>{
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const jwk=publicKey.export({format:"jwk"});
 if(typeof jwk.x!=="string")throw Error("Missing Ed25519 public key");
 const signer=stellarAddress(Buffer.from(jwk.x,"base64url"));
 const invited="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
 const org="9a1a395f-249c-4907-b657-d48df4b38d28";
 const invite="b3a295f4-0a37-4da4-94c2-38f2f0ee5729";
 await page.goto("/login");
 const origin=new URL(page.url()).origin;
 const challenge=await page.request.post("/api/auth/challenge",{data:{address:signer},headers:{origin}});
 expect(challenge.status()).toBe(200);
 const payload=await challenge.json() as {message:string};
 const verified=await page.request.post("/api/auth/verify",{
  data:{address:signer,signature:signature(payload.message,privateKey)},headers:{origin}
 });
 expect(verified.status()).toBe(200);
 await page.route("**/api/account/organizations/*/team",route=>route.fulfill({json:{
  schema_version:1,network:"testnet",source:"neon-organization-team",
  account_address:signer,organization:{id:org,display_name:"Test Merchant Only",
   status:"active",your_role:"owner"},
  members:[{account_address:signer,role:"owner",joined_at_unix:1800000000}],
  next_cursor:null,business_verified:false,invitation_issuance_enabled:false,
  payment_execution_enabled:false,organization_payment_authorized:false
 }}));
 let issued=false;
 let revoked=false;
 const actions:unknown[]=[];
 // Organization-scoped GETs include a query; match exact path and query.
 await page.route("**/api/account/team-invites*",async route=>{
  const method=route.request().method();
  if(method==="POST"){
   const action=route.request().postDataJSON() as {action:string};
   actions.push(action);
   if(action.action==="create")issued=true;
   if(action.action==="revoke")revoked=true;
   await route.fulfill({status:204,body:""});
   return;
  }
  await route.fulfill({json:{
   schema_version:1,network:"testnet",source:"neon-team-invitations",
   account_address:signer,received:[],
   sent:issued?[{id:invite,organization_id:org,organization_name:"Test Merchant Only",
    peer_address:invited,role:"viewer",status:revoked?"revoked":"pending",
    created_at_unix:1800000000,expires_at_unix:1800604800}]:[],
   received_more:false,sent_more:false,business_verified:false,
   payment_execution_enabled:false,organization_payment_authorized:false
  }});
 });
 await page.goto("/app/business/"+org);
 await expect(page.getByRole("heading",{name:"People, roles, and progress."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Invite a viewer"})).toBeVisible();
 await page.getByLabel("Recipient's Stellar G-address").fill(invited);
 await page.getByRole("button",{name:"Invite viewer"}).click();
 await expect(page.getByRole("button",{name:"Revoke invitation"})).toBeVisible();
 await page.getByRole("button",{name:"Revoke invitation"}).click();
 await expect(page.getByText(/Viewer · revoked/)).toBeVisible();
 expect(actions).toEqual([
  {action:"create",organization_id:org,invited_account:invited,role:"viewer"},
  {action:"revoke",invitation_id:invite}
 ]);
 await expect(page.getByRole("button",{name:/Submit settlement|Authorize payment|Claim fees/})).toHaveCount(0);
});
