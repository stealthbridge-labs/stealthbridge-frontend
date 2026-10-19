import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const MAX_BYTES=12_288;
const PASS="Test SDF Network ; September 2015";
function safeBackend():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app";
 try{
  const u=new URL(raw);
  // Never proxy arbitrary hosts. The public status route accepts no URLs, paths,
  // wallet addresses, auth headers, or user-selected RPC nodes.
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname!=="/")return null;
  if(u.hostname!=="stealthbridge-backend.vercel.app"&&
     !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(u.hostname))return null;
  return u;
 }catch{return null;}
}
async function readJson(origin:URL,path:string):Promise<Record<string,unknown>>{
 const url=new URL(path,origin);
 const response=await fetch(url,{method:"GET",headers:{accept:"application/json"},
  redirect:"error",cache:"no-store",signal:AbortSignal.timeout(7000)});
 if(!response.ok||!response.headers.get("content-type")?.includes("application/json")||
    Number(response.headers.get("content-length")??0)>MAX_BYTES)throw Error("UPSTREAM_UNAVAILABLE");
 const reader=response.body?.getReader();
 if(!reader)throw Error("UPSTREAM_EMPTY");
 const chunks:Uint8Array[]=[];let size=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;
   size+=value.length;if(size>MAX_BYTES)throw Error("UPSTREAM_TOO_LARGE");
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let pos=0;
 for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
 const parsed:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("INVALID_UPSTREAM");
 return parsed as Record<string,unknown>;
}
export async function GET(){
 const origin=safeBackend();
 if(!origin)return NextResponse.json({code:"BACKEND_NOT_CONFIGURED"},{status:503,
  headers:{"cache-control":"no-store"}});
 try{
  const [network,capabilities]=await Promise.all([
   readJson(origin,"/v1/network"),readJson(origin,"/v1/capabilities")
  ]);
  if(network.network!=="testnet"||network.passphrase!==PASS||
     network.source!=="stellar-rpc"||
     !Number.isSafeInteger(network.ledger_sequence)||
     Number(network.ledger_sequence)<1||
     typeof network.ledger_closed_at_unix!=="string"||
     !/^[0-9]{1,20}$/.test(network.ledger_closed_at_unix)||
     !["payments_enabled","confidential_token_verified",
       "private_payments_verified","fiat_payouts_enabled"].every(k=>capabilities[k]===false))
      throw Error("INVALID_UPSTREAM");
  const age=Math.floor(Date.now()/1000)-Number(network.ledger_closed_at_unix);
  if(age< -30||age>180)throw Error("STALE_UPSTREAM");
  return NextResponse.json({
   source:"stealthbridge-public-testnet-read",network:"testnet",passphrase:PASS,
   ledger_sequence:network.ledger_sequence,
   ledger_closed_at_unix:network.ledger_closed_at_unix,
   payment_execution_enabled:false,
   confidential_token_verified:false,private_payments_verified:false,
   fiat_payouts_enabled:false,smart_account_deployment_verified:false
  },{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
 }catch{
  return NextResponse.json({code:"PUBLIC_NETWORK_UNAVAILABLE"},{status:503,
   headers:{"cache-control":"no-store"}});
 }
}
