import {createHash,createHmac,createPublicKey,randomBytes,timingSafeEqual,verify as ed25519Verify} from "node:crypto";
import {canonicalStellarAccountAddress} from "./stellar-address";

export const TESTNET_PASSPHRASE="Test SDF Network ; September 2015";
export const CHALLENGE_COOKIE="sb_auth_challenge";
export const SESSION_COOKIE="sb_user_session";
const MESSAGE_PREFIX="Stellar Signed Message:\n";
const CHALLENGE_SECONDS=300;
const SESSION_SECONDS=7200;
type Challenge={type:"challenge";address:string;origin:string;nonce:string;expires:number;message:string};
type Session={type:"session";address:string;issued:number;expires:number;nonce:string};
export type WalletIdentity={address:string;expires:number};

function authSecret():string|null{
 const value=process.env.STEALTHBRIDGE_WEB_SESSION_SECRET;
 return value&&Buffer.byteLength(value,"utf8")>=32?value:null;
}
export function isWalletSignInAvailable(){return authSecret()!==null;}
function signPayload(payload:Challenge|Session,secret:string):string{
 const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
 const signature=createHmac("sha256",secret).update(body).digest("base64url");
 return body+"."+signature;
}
function readPayload(input:string|undefined,secret:string):unknown{
 if(!input||input.length>3072||input.split(".").length!==2)return null;
 const [body,tag]=input.split(".");
 if(!/^[A-Za-z0-9_-]+$/.test(body)||!/^[A-Za-z0-9_-]+$/.test(tag))return null;
 const expected=createHmac("sha256",secret).update(body).digest();
 const actual=Buffer.from(tag,"base64url");
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{return JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as unknown;}catch{return null;}
}
function isRecord(input:unknown):input is Record<string,unknown>{
 return !!input&&typeof input==="object"&&!Array.isArray(input);
}
function validExpiry(expires:unknown,now:number,windowSeconds:number):expires is number{
 return Number.isSafeInteger(expires)&&Number(expires)>now&&Number(expires)<=now+windowSeconds;
}
export function createChallenge(address:string,origin:string,now=Math.floor(Date.now()/1000)){
 const secret=authSecret();
 const canonical=canonicalStellarAccountAddress(address);
 if(!secret||!canonical||!/^https?:\/\/[^/]+$/.test(origin))return null;
 const nonce=randomBytes(24).toString("base64url");
 const expires=now+CHALLENGE_SECONDS;
 const message=[
  "Sign in to StealthBridge",
  "Origin: "+origin,
  "Network: "+TESTNET_PASSPHRASE,
  "Account: "+canonical,
  "Nonce: "+nonce,
  "Expires: "+new Date(expires*1000).toISOString(),
  "Purpose: Sign in to your read-only StealthBridge workspace.",
  "No transaction, payment, approval or transfer is authorized."
 ].join("\n");
 const challenge:Challenge={type:"challenge",address:canonical,origin,nonce,expires,message};
 return {message,token:signPayload(challenge,secret),expires};
}
export function validatedChallenge(token:string|undefined,address:string,origin:string,now=Math.floor(Date.now()/1000)):Challenge|null{
 const secret=authSecret();
 if(!secret)return null;
 const item=readPayload(token,secret);
 if(!isRecord(item)||item.type!=="challenge"||item.origin!==origin||
  item.address!==canonicalStellarAccountAddress(address)||!validExpiry(item.expires,now,CHALLENGE_SECONDS)||
  typeof item.nonce!=="string"||!/^[A-Za-z0-9_-]{32}$/.test(item.nonce)||
  typeof item.message!=="string"||item.message.length>750||
  !item.message.includes("Nonce: "+item.nonce+"\n")||
  !item.message.includes("Account: "+item.address+"\n")||
  !item.message.includes("Origin: "+origin+"\n")||
  !item.message.includes("Network: "+TESTNET_PASSPHRASE+"\n")
 )return null;
 return item as Challenge;
}
function rawStellarPublicKey(address:string):Buffer|null{
 if(!canonicalStellarAccountAddress(address))return null;
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
 const bytes:number[]=[];
 let accumulator=0,bits=0;
 for(const letter of address){
  accumulator=(accumulator<<5)|alphabet.indexOf(letter);bits+=5;
  if(bits>=8){bits-=8;bytes.push((accumulator>>bits)&255);accumulator&=(1<<bits)-1;}
 }
 return bytes.length===35&&bytes[0]===48?Buffer.from(bytes.slice(1,33)):null;
}
function signedBytes(signature:string):Buffer|null{
 if(signature.length>200)return null;
 if(/^[a-fA-F0-9]{128}$/.test(signature))return Buffer.from(signature,"hex");
 if(/^[A-Za-z0-9+/]{86}==$/.test(signature)){
  const bytes=Buffer.from(signature,"base64");
  return bytes.length===64?bytes:null;
 }
 return null;
}
/** SEP-53 signing: Ed25519 over SHA-256("Stellar Signed Message:\\n"+message). */
export function verifyWalletMessage(address:string,message:string,signature:string):boolean{
 const key=rawStellarPublicKey(address);
 const bytes=signedBytes(signature);
 if(!key||!bytes||message.length>750)return false;
 const spki=Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),key]);
 const digest=createHash("sha256").update(MESSAGE_PREFIX).update(message,"utf8").digest();
 try{return ed25519Verify(null,digest,createPublicKey({key:spki,format:"der",type:"spki"}),bytes);}catch{return false;}
}
export function createSession(challenge:Challenge,now=Math.floor(Date.now()/1000)):string|null{
 const secret=authSecret();
 if(!secret||!validExpiry(challenge.expires,now,CHALLENGE_SECONDS))return null;
 return signPayload({type:"session",address:challenge.address,issued:now,expires:now+SESSION_SECONDS,
  nonce:randomBytes(16).toString("base64url")},secret);
}
export function readWalletSession(value:string|undefined,now=Math.floor(Date.now()/1000)):WalletIdentity|null{
 const secret=authSecret();
 if(!secret)return null;
 const item=readPayload(value,secret);
 if(!isRecord(item)||item.type!=="session"||typeof item.address!=="string"||
  !canonicalStellarAccountAddress(item.address)||!Number.isSafeInteger(item.issued)||
  Number(item.issued)>now+30||Number(item.issued)<now-SESSION_SECONDS-30||
  !validExpiry(item.expires,now,SESSION_SECONDS+30)||Number(item.expires)-Number(item.issued)!==SESSION_SECONDS||
  typeof item.nonce!=="string"||!/^[A-Za-z0-9_-]{22}$/.test(item.nonce))return null;
 return {address:item.address,expires:item.expires as number};
}
export const AUTH_COOKIE_OPTIONS={
 httpOnly:true as const,sameSite:"strict" as const,secure:process.env.NODE_ENV==="production",
 path:"/" as const,
};
export function validSameOrigin(request:Request){
 const supplied=request.headers.get("origin");
 if(!supplied)return false;
 try{return new URL(supplied).origin===new URL(request.url).origin;}catch{return false;}
}
