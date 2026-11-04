/** Customer-held encrypted drafts. This is neither a ZK payment proof nor a
 * smart-account authorization. The API is intentionally network-free. */
import {canonicalStellarAccountAddress} from "./stellar-address";
import {isContractStrKey} from "./observer-activity";

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const AMOUNT=/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/;
const B64=/^[A-Za-z0-9_-]+$/;
const PASSPHRASE="Test SDF Network ; September 2015";
const DOMAIN="StealthBridge encrypted customer draft v1";
const ITERATIONS=600_000;
export const PRIVATE_DRAFT_LIMIT=8;
export type CustomerDraft={kind:"personal"|"business";corridor_id:string;recipient:string;amount:string;reference:string};
export type EncryptedCustomerDraft={
 schema_version:1;network:"testnet";cipher:"AES-256-GCM";kdf:"PBKDF2-HMAC-SHA256";
 iterations:600000;salt:string;iv:string;ciphertext:string;
};
export type CustomerEncryptedDraftRecord={id:string;revision:number;updated_at_unix:number;encrypted:EncryptedCustomerDraft};
export type CustomerEncryptedDraftDirectory={
 schema_version:1;network:"testnet";source:"customer-ciphertext-vault";account_address:string;
 drafts:CustomerEncryptedDraftRecord[];payment_execution_enabled:false;plaintext_available_to_server:false;
};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const base64url=(bytes:Uint8Array)=>btoa(Array.from(bytes,x=>String.fromCharCode(x)).join("")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
function decode(s:string,bytes:number):Uint8Array<ArrayBuffer>{
 if(typeof s!=="string"||!B64.test(s)||s.length>8192)throw new TypeError("Invalid ciphertext encoding");
 const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/"));
 const result=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if((bytes>0&&result.length!==bytes)||(bytes===0&&(result.length<17||result.length>3072))||base64url(result)!==s)
  throw new TypeError("Invalid ciphertext length or encoding");
 return new Uint8Array(result);
}
function validatedAccount(account:string):string{
 const valid=canonicalStellarAccountAddress(account);
 if(!valid||valid!==account)throw new TypeError("A canonical Stellar account is required");
 return valid;
}
function aad(account:string,id:string):Uint8Array<ArrayBuffer>{
 validatedAccount(account);
 if(!UUID.test(id))throw new TypeError("Invalid draft identifier");
 return new Uint8Array(new TextEncoder().encode(`${DOMAIN}\nnetwork:${PASSPHRASE}\naccount:${account}\ndraft:${id}\n`));
}
export function validCustomerDraft(input:unknown):input is CustomerDraft{
 if(!input||typeof input!=="object"||Array.isArray(input))return false;
 const v=input as Record<string,unknown>;
 return exact(v,["kind","corridor_id","recipient","amount","reference"])&&
   (v.kind==="personal"||v.kind==="business")&&typeof v.corridor_id==="string"&&UUID.test(v.corridor_id)&&
   typeof v.recipient==="string"&&(canonicalStellarAccountAddress(v.recipient)!==null||isContractStrKey(v.recipient))&&
   typeof v.amount==="string"&&AMOUNT.test(v.amount)&&/[1-9]/.test(v.amount)&&
   typeof v.reference==="string"&&/^[A-Za-z0-9_-]{0,64}$/.test(v.reference)&&
   (v.kind==="personal"?v.reference==="":v.reference.length>=3);
}
export function validEncryptedCustomerDraft(input:unknown):input is EncryptedCustomerDraft{
 if(!input||typeof input!=="object"||Array.isArray(input))return false;
 const v=input as Record<string,unknown>;
 if(!exact(v,["schema_version","network","cipher","kdf","iterations","salt","iv","ciphertext"])||
   v.schema_version!==1||v.network!=="testnet"||v.cipher!=="AES-256-GCM"||
   v.kdf!=="PBKDF2-HMAC-SHA256"||v.iterations!==ITERATIONS)return false;
 try{decode(v.salt as string,16);decode(v.iv as string,12);decode(v.ciphertext as string,0);return true;}
 catch{return false;}
}
function validPassword(password:string):boolean{
 return typeof password==="string"&&[...password].length>=14&&
  new TextEncoder().encode(password).byteLength<=256&&
  !/[\u0000-\u001f\u007f]/.test(password);
}
async function derive(password:string,salt:Uint8Array<ArrayBuffer>):Promise<CryptoKey>{
 const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:new Uint8Array(salt),iterations:ITERATIONS,hash:"SHA-256"},material,
  {name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function encryptCustomerDraft(account:string,id:string,password:string,draft:CustomerDraft):Promise<EncryptedCustomerDraft>{
 const additionalData=aad(account,id);
 if(!validPassword(password))throw new TypeError("Use a strong vault passphrase of at least 14 characters");
 if(!validCustomerDraft(draft))throw new TypeError("Invalid local payment draft");
 if(!crypto?.subtle||!crypto.getRandomValues)throw Error("Secure browser cryptography unavailable");
 const plain=new Uint8Array(new TextEncoder().encode(JSON.stringify(draft)));
 if(plain.length>1400)throw new TypeError("Draft exceeds privacy vault size limit");
 const salt=new Uint8Array(crypto.getRandomValues(new Uint8Array(16)));
 const iv=new Uint8Array(crypto.getRandomValues(new Uint8Array(12)));
 const key=await derive(password,salt);
 const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData,tagLength:128},key,plain);
 return {schema_version:1,network:"testnet",cipher:"AES-256-GCM",kdf:"PBKDF2-HMAC-SHA256",
  iterations:ITERATIONS,salt:base64url(salt),iv:base64url(iv),ciphertext:base64url(new Uint8Array(encrypted))};
}
export async function decryptCustomerDraft(account:string,id:string,password:string,record:EncryptedCustomerDraft):Promise<CustomerDraft>{
 const additionalData=aad(account,id);
 if(!validPassword(password)||!validEncryptedCustomerDraft(record))throw new TypeError("Invalid vault unlock input");
 try{
  const key=await derive(password,decode(record.salt,16));
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(record.iv,12),additionalData,tagLength:128},key,decode(record.ciphertext,0));
  if(plain.byteLength>1400)throw Error("OVERSIZED");
  const draft:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(plain));
  if(!validCustomerDraft(draft))throw Error("INVALID_DRAFT");
  return draft;
 }catch{throw new Error("Unable to unlock the draft. Check your passphrase or encrypted data.");}
}
export function validEncryptedDraftDirectory(input:unknown,account:string):input is CustomerEncryptedDraftDirectory{
 if(!input||typeof input!=="object"||Array.isArray(input)||canonicalStellarAccountAddress(account)!==account)return false;
 const v=input as Record<string,unknown>;
 if(!exact(v,["schema_version","network","source","account_address","drafts","payment_execution_enabled","plaintext_available_to_server"])||
    v.schema_version!==1||v.network!=="testnet"||v.source!=="customer-ciphertext-vault"||
    v.account_address!==account||v.payment_execution_enabled!==false||v.plaintext_available_to_server!==false||
    !Array.isArray(v.drafts)||v.drafts.length>PRIVATE_DRAFT_LIMIT)return false;
 const found=new Set<string>();
 for(const entry of v.drafts){
  if(!entry||typeof entry!=="object"||Array.isArray(entry))return false;
  const row=entry as Record<string,unknown>;
  if(!exact(row,["id","revision","updated_at_unix","encrypted"])||typeof row.id!=="string"||!UUID.test(row.id)||found.has(row.id)||
   !Number.isSafeInteger(row.revision)||Number(row.revision)<1||
   !Number.isSafeInteger(row.updated_at_unix)||Number(row.updated_at_unix)<=0||
   !validEncryptedCustomerDraft(row.encrypted))return false;
  found.add(row.id);
 }
 return true;
}
