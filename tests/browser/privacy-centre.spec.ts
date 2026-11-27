import {expect,test} from "@playwright/test";
import {Keypair} from "@stellar/stellar-sdk";
import {createHash} from "node:crypto";

async function signIn(page:import("@playwright/test").Page){
 const key=Keypair.random();
 await page.goto("/login");
 const origin=new URL(page.url()).origin;
 const challenge=await page.request.post("/api/auth/challenge",{data:{address:key.publicKey()},headers:{origin}});
 expect(challenge.status()).toBe(200);
 const {message}=await challenge.json() as {message:string};
 const signature=Buffer.from(key.sign(createHash("sha256").update("Stellar Signed Message:\n"+message).digest())).toString("base64");
 expect((await page.request.post("/api/auth/verify",{data:{address:key.publicKey(),signature},headers:{origin}})).status()).toBe(200);
}

test("privacy centre states what is public and keeps NO_GO rails unavailable",async({page})=>{
 await signIn(page);
 await page.goto("/app/privacy");
 await expect(page.getByRole("heading",{level:1,name:"Privacy centre"})).toBeVisible();
 await expect(page.getByText("Your payments today are public on Stellar.")).toBeVisible();
 await expect(page.getByRole("navigation",{name:"Product areas"}).getByRole("link",{name:"Privacy centre"})).toHaveAttribute("aria-current","page");
 for(const name of ["Passkey payments","Encrypted drafts"])
  await expect(page.getByRole("article",{name}).getByText("Live on Testnet")).toBeVisible();
 await expect(page.getByRole("article",{name:"Personal: shielded pool"}).getByText("Research only · not available")).toBeVisible();
 await expect(page.getByRole("article",{name:"Business: confidential token"}).getByText("Not available",{exact:true})).toBeVisible();
 await expect(page.getByText(/single-party trusted setup/)).toBeVisible();
 // No control can switch a privacy rail on.
 await expect(page.getByRole("button",{name:/enable|turn on|activate|go private|send privately/i})).toHaveCount(0);
 await expect(page.getByRole("switch")).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
