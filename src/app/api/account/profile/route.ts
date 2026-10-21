import {createHash,createHmac,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {currentWalletIdentity} from "@/lib/auth-server";
import {validSameOrigin} from "@/lib/wallet-auth";
import {validProfileEnvelope,validProfileInput} from "@/lib/account-profile";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"cache-control":"private, no-store","x-content-type-options":"nosniff"};
const MAX_BODY=4096;
function trustedBackend():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||
  "https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||
    url.search||url.hash||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
    !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
async function relay(request:Request,method:"GET"|"PATCH"){
 const identity=await currentWalletIdentity();
 if(!identity)return NextResponse.json({code:"SESSION_REQUIRED"},{status:401,headers});
 if(process.env.STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED!=="true")
  return NextResponse.json({code:"PROFILE_NOT_RELEASED"},{status:503,headers});
 if(new URL(request.url).search)return NextResponse.json({code:"INVALID_QUERY"},{status:400,headers});
 if(method==="PATCH"&&!validSameOrigin(request))
  return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers});
 const secret=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const backend=trustedBackend();
 if(!secret||Buffer.byteLength(secret)<32||!backend)
  return NextResponse.json({code:"PROFILE_SERVICE_NOT_CONFIGURED"},{status:503,headers});
 let body="";
 if(method==="PATCH"){
  if(!request.headers.get("content-type")?.startsWith("application/json")||
     Number(request.headers.get("content-length")??0)>1024)
   return NextResponse.json({code:"INVALID_PROFILE"},{status:400,headers});
  try{
   const text=await request.text();
   if(!text||Buffer.byteLength(text,"utf8")>1024)throw Error("OVERSIZED");
   const input:unknown=JSON.parse(text);
   if(!validProfileInput(input))throw Error("INVALID");
   body=JSON.stringify(input);
  }catch{return NextResponse.json({code:"INVALID_PROFILE"},{status:400,headers});}
 }
 const nonce=method==="PATCH"?randomUUID():"";
 const digest=method==="PATCH"?createHash("sha256").update(body).digest("hex"):"";
 const stamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac("sha256",secret).update(
  "stealthbridge-customer-profile-v1\n"+method+
  "\n/v1/account/profile\n"+identity.address+"\n"+stamp+
  "\n"+nonce+"\n"+digest+"\n","utf8").digest("hex");
 const signedHeaders:Record<string,string>={
  accept:"application/json",
  "x-stealthbridge-account":identity.address,
  "x-stealthbridge-issued-at":stamp,
  "x-stealthbridge-signature":signature
 };
 if(method==="PATCH"){
  signedHeaders["x-stealthbridge-nonce"]=nonce;
  signedHeaders["content-type"]="application/json";
 }
 try{
  const response=await fetch(new URL("/v1/account/profile",backend),{
   method,headers:signedHeaders,cache:"no-store",redirect:"error",
   signal:AbortSignal.timeout(8000),...(method==="PATCH"?{body}:{})
  });
  if(response.status===409)return NextResponse.json({code:"REPLAYED_UPDATE"},{status:409,headers});
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json"))
   throw Error("UNAVAILABLE");
  const length=response.headers.get("content-length");
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BODY))
   throw Error("OVERSIZED");
  const reader=response.body?.getReader();if(!reader)throw Error("EMPTY");
  let size=0;const parts:Uint8Array[]=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BODY)throw Error("OVERSIZED");
    parts.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let pos=0;
  for(const part of parts){bytes.set(part,pos);pos+=part.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validProfileEnvelope(data,identity.address)||
    method==="PATCH"&&(data as {profile:unknown}).profile===null)
   throw Error("INVALID");
  return NextResponse.json(data,{headers});
 }catch{
  return NextResponse.json({code:"PROFILE_STORAGE_UNAVAILABLE"},{status:503,headers});
 }
}
export async function GET(request:Request){return relay(request,"GET");}
export async function PATCH(request:Request){return relay(request,"PATCH");}
