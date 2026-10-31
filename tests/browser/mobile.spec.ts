import {expect,test} from "@playwright/test";
import {createHash,generateKeyPairSync,sign} from "node:crypto";

test("homepage mobile navigation expands and follows a product link",async({page})=>{
 await page.goto("/");

 const navigation=page.getByRole("navigation",{name:"Main navigation"});
 const open=page.getByRole("button",{name:"Open navigation"});
 await expect(open).toHaveAttribute("aria-expanded","false");
 await expect(navigation).toBeHidden();

 await open.click();
 await expect(page.getByRole("button",{name:"Close navigation"})).toHaveAttribute("aria-expanded","true");
 await expect(navigation).toBeVisible();
 await navigation.getByRole("link",{name:"For business"}).click();
 await expect(page).toHaveURL(/\/business$/);
});

test("product-page mobile navigation expands, collapses, and navigates",async({page})=>{
 await page.goto("/discover/business");

 const navigation=page.getByRole("navigation",{name:"Product navigation"});
 await page.getByRole("button",{name:"Open menu"}).click();
 const close=page.getByRole("button",{name:"Close menu"});
 await expect(close).toHaveAttribute("aria-expanded","true");
 await expect(navigation).toBeVisible();

 await close.click();
 await expect(page.getByRole("button",{name:"Open menu"})).toHaveAttribute("aria-expanded","false");
 await expect(navigation).toBeHidden();

 await page.getByRole("button",{name:"Open menu"}).click();
 await navigation.getByRole("link",{name:"Send",exact:true}).click();
 await expect(page).toHaveURL(/\/send$/);
});

function mobileTestAddress(publicKey:Buffer){
 const payload=Buffer.concat([Buffer.from([48]),publicKey]);let crc=0;
 for(const value of payload){crc^=value<<8;
  for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 const raw=Buffer.concat([payload,Buffer.from([crc&255,crc>>>8])]);
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits=0,acc=0,result="";
 for(const value of raw){acc=(acc<<8)|value;bits+=8;
  while(bits>=5){bits-=5;result+=alphabet[(acc>>>bits)&31];acc&=(1<<bits)-1;}}
 return result;
}

test("signed-in product navigation stays usable on a narrow phone, with no payment activation",async({page})=>{
 test.slow();
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const key=publicKey.export({format:"jwk"});
 if(typeof key.x!=="string")throw Error("No public account key");
 const address=mobileTestAddress(Buffer.from(key.x,"base64url"));
 await page.goto("/login");
 const origin=new URL(page.url()).origin;
 const challenge=await page.request.post("/api/auth/challenge",{
  data:{address},headers:{origin}
 });
 expect(challenge.status()).toBe(200);
 const {message}=await challenge.json() as {message:string};
 const signature=sign(null,createHash("sha256").update("Stellar Signed Message:\n"+message).digest(),
  privateKey).toString("base64");
 const verified=await page.request.post("/api/auth/verify",{
  data:{address,signature},headers:{origin}
 });
 expect(verified.status()).toBe(200);
 await page.goto("/app");
 const nav=page.getByRole("navigation",{name:"Product areas"});
 await expect(nav).toBeVisible();
 await expect(nav.getByRole("link",{name:"Overview"})).toHaveAttribute("aria-current","page");
 const dimensions=await page.evaluate(()=>({
  pageWidth:document.documentElement.scrollWidth,
  viewportWidth:window.innerWidth,
  navScrollable:(document.querySelector(".account-nav-scroll")?.scrollWidth??0)>
   (document.querySelector(".account-nav-scroll")?.clientWidth??0)
 }));
 expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth+1);
 expect(dimensions.navScrollable).toBe(true);
 await nav.getByRole("link",{name:"Single payment"}).click();
 await expect(page).toHaveURL(/\/app\/business\/payments$/);
 await expect(nav.getByRole("link",{name:"Single payment"})).toHaveAttribute("aria-current","page");
 await expect(page.getByRole("heading",{name:"New business payment"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Submit settlement"})).toBeDisabled();
 await nav.getByRole("link",{name:"Workspace"}).click();
 await expect(page.getByRole("heading",{name:"Your business, across borders."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"New business payment"})).toHaveCount(0);
});
