import {canonicalStellarAccountAddress} from "./stellar-address";

const HORIZON="https://horizon-testnet.stellar.org";
const MAX_ACCOUNT_BYTES=32_768;
const AMOUNT=/^(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,7})?$/;
export interface PublicTestnetAccount {
 address:string;
 nativeXlmBalance:string;
 sequence:string;
 source:"stellar-horizon-testnet";
 /**
  * The observed balance is a public ledger record, not spendable funds,
  * private wallet ownership, token balance, or payment authorization.
  */
 financialExecutionAuthorized:false;
}
function object(value:unknown):value is Record<string,unknown>{
 return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
export function parsePublicTestnetAccount(data:unknown,address:string):PublicTestnetAccount{
 const expected=canonicalStellarAccountAddress(address);
 if(!expected||!object(data)||data.account_id!==expected||
    typeof data.sequence!=="string"||!/^[1-9][0-9]{0,22}$/.test(data.sequence)||
    !Array.isArray(data.balances)||data.balances.length>100)
  throw new Error("Public Testnet account response is invalid");
 const native=data.balances.filter(entry=>object(entry)&&entry.asset_type==="native");
 if(native.length!==1||!object(native[0])||typeof native[0].balance!=="string"||
    !AMOUNT.test(native[0].balance))
  throw new Error("Horizon did not return one valid native XLM balance");
 return {address:expected,sequence:data.sequence,
  nativeXlmBalance:native[0].balance,source:"stellar-horizon-testnet",
  financialExecutionAuthorized:false};
}
/**
 * Consent-driven direct browser GET. The public address is disclosed to
 * Stellar Testnet Horizon ONLY after the caller's explicit user action.
 * Never accepts arbitrary URLs, headers, private keys or signing material.
 */
export async function getPublicTestnetAccount(
 address:string,
 fetchImpl:typeof fetch=fetch,
 signal?:AbortSignal,
):Promise<PublicTestnetAccount>{
 const validated=canonicalStellarAccountAddress(address);
 if(!validated)throw new TypeError("Invalid checksummed public G-address");
 const abort=signal?
  AbortSignal.any([signal,AbortSignal.timeout(9_000)]):AbortSignal.timeout(9_000);
 const response=await fetchImpl(HORIZON+"/accounts/"+validated,{
  method:"GET",headers:{"accept":"application/json"},
  redirect:"error",cache:"no-store",credentials:"omit",signal:abort,
 });
 if(response.status===404)throw new Error("This public account is not funded on Stellar Testnet");
 if(!response.ok)throw new Error("Cannot verify public Stellar Testnet account");
 if(!response.headers.get("content-type")?.includes("application/json"))
  throw new Error("Unexpected Stellar Testnet response type");
 const advertised=Number(response.headers.get("content-length")??0);
 if(!Number.isFinite(advertised)||advertised>MAX_ACCOUNT_BYTES)
  throw new Error("Stellar Testnet response exceeds size limit");
 const reader=response.body?.getReader();
 if(!reader)throw new Error("Empty Stellar Testnet account response");
 const chunks:Uint8Array[]=[];
 let count=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   count+=value.length;
   if(count>MAX_ACCOUNT_BYTES)throw new Error("Stellar Testnet response exceeds size limit");
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const data=new Uint8Array(count);
 let offset=0;
 for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 let json:unknown;
 try{json=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(data));}
 catch{throw new Error("Invalid Stellar Testnet JSON response");}
 return parsePublicTestnetAccount(json,validated);
}
