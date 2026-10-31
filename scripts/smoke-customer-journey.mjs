/**
 * Read-only production customer-journey smoke. Generates a disposable Ed25519
 * signing key in process memory and never serializes it or prints its address.
 * The only POSTs are cookie-bound sign-in challenge and signature verification.
 * Never creates profiles, organizations, payments, keys, drafts or payouts.
 */
import {createHash,generateKeyPairSync,sign} from "node:crypto";
const ORIGIN=process.env.STEALTHBRIDGE_SMOKE_ORIGIN||"https://stealthbridge.vercel.app";
if(!["https://stealthbridge.vercel.app","http://127.0.0.1:3199"].includes(ORIGIN))
 throw Error("Refusing an unapproved customer-journey origin");
function strKeyFromPublicKey(key){
 const data=Buffer.concat([Buffer.from([48]),key]);let crc=0;
 for(const byte of data){crc^=byte<<8;for(let i=0;i<8;i++)
  crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
 const payload=Buffer.concat([data,Buffer.from([crc&255,crc>>>8])]);
 const base32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let acc=0,bits=0,out="";
 for(const byte of payload){acc=(acc<<8)|byte;bits+=8;
  while(bits>=5){bits-=5;out+=base32[(acc>>>bits)&31];acc&=(1<<bits)-1;}}
 if(!/^G[A-Z2-7]{55}$/.test(out))throw Error("Malformed generated StrKey");
 return out;
}
function check(value,message){if(!value)throw Error(message);}
async function asJson(path,options={}){
 const response=await fetch(ORIGIN+path,{cache:"no-store",redirect:"error",
  signal:AbortSignal.timeout(12000),...options});
 const type=response.headers.get("content-type");
 check(type?.includes("application/json"),path+" did not return JSON");
 const text=await response.text();
 check(text.length<=8192,path+" response was unexpectedly large");
 return {response,data:JSON.parse(text)};
}
async function main(){
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 const jwk=publicKey.export({format:"jwk"});
 check(typeof jwk.x==="string","Invalid ephemeral Ed25519 keypair");
 const address=strKeyFromPublicKey(Buffer.from(jwk.x,"base64url"));
 const challenge=await asJson("/api/auth/challenge",{
  method:"POST",headers:{"content-type":"application/json",origin:ORIGIN},
  body:JSON.stringify({address})
 });
 check(challenge.response.status===200,"Sign-in challenge unavailable");
 const challengeCookie=challenge.response.headers.getSetCookie()
  .find(value=>value.startsWith("sb_auth_challenge="))?.split(";")[0];
 check(challengeCookie,"Missing signed challenge cookie");
 check(challenge.data.message.includes("No transaction, payment, approval or transfer is authorized."),
  "Challenge has incorrect authorization scope");
 const digest=createHash("sha256").update("Stellar Signed Message:\n"+
  challenge.data.message,"utf8").digest();
 const signature=sign(null,digest,privateKey).toString("base64");
 const verified=await asJson("/api/auth/verify",{
  method:"POST",headers:{"content-type":"application/json",origin:ORIGIN,cookie:challengeCookie},
  body:JSON.stringify({address,signature})
 });
 check(verified.response.status===200&&verified.data.authenticated===true,
  "Signed-message verification failed");
 const cookie=verified.response.headers.getSetCookie()
  .find(value=>value.startsWith("sb_user_session="))?.split(";")[0];
 check(cookie,"No authenticated session cookie");
 const common={headers:{cookie}};
 const results={};
 const session=await asJson("/api/auth/session",common);
 check(session.response.status===200&&session.data.authenticated&&session.data.address===address,
  "Authenticated session mismatch");
 results.session=200;
 const profile=await asJson("/api/account/profile",common);
 check(profile.response.status===200&&profile.data.source==="neon-customer-profiles"&&
  profile.data.account_address===address&&profile.data.network==="testnet"&&
  profile.data.payment_execution_enabled===false&&
  profile.data.organization_payment_authorized===false,
  "Customer profile BFF/Neon read failed");
 results.customerProfile=200;
 const directory=await asJson("/api/account/directory",common);
 check(directory.response.status===200&&directory.data.source==="neon-active-memberships"&&
  directory.data.account_address===address&&Array.isArray(directory.data.organizations)&&
  directory.data.payment_execution_enabled===false,
  "Account organization directory read failed");
 results.organizations=200;
 const business=await asJson("/api/account/business-onboarding",common);
 check(business.response.status===200&&
  business.data.source==="neon-pending-business-applications"&&
  business.data.account_address===address&&Array.isArray(business.data.applications)&&
  business.data.payment_execution_enabled===false&&
  business.data.organization_payment_authorized===false,
  "Business onboarding read failed");
 results.business=200;
 for(const path of ["/app","/app/settings","/app/send","/app/business"]){
  const response=await fetch(ORIGIN+path,{headers:{cookie},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000)});
  check(response.status===200,"Signed-in page unavailable: "+path);
  results[path]=200;
 }
 const publicStatus=await asJson("/api/public/status");
 check(publicStatus.response.status===200&&
  publicStatus.data.payment_execution_enabled===false,
  "Public payment execution safety gate changed unexpectedly");
 results.paymentsEnabled=false;
 console.log(JSON.stringify({result:"customer-journey-read-only-smoke-passed",
  network:"Stellar Testnet",statuses:results,profileReadFromNeon:true,
  bankOrPaymentDetailsSubmitted:false,accountProfileWritten:false,
  businessOnboardingWritten:false,transactionsBroadcast:0},null,2));
}
main().catch(error=>{
 console.error("Customer smoke FAILED:",error.message);
 process.exitCode=1;
});
