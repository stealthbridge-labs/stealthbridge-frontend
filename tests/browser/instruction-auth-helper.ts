import {expect} from "@playwright/test";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
function stellarAddress(key:Buffer):string{
 const data=Buffer.concat([Buffer.from([48]),key]);let crc=0;
 for(const b of data){crc^=b<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 const raw=Buffer.concat([data,Buffer.from([crc&255,crc>>8])]);
 const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits=0,acc=0,out="";
 for(const b of raw){acc=(acc<<8)|b;bits+=8;while(bits>=5){bits-=5;out+=abc[(acc>>>bits)&31];acc&=(1<<bits)-1;}}
 return out;
}
export async function signIn(page:import("@playwright/test").Page){
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
