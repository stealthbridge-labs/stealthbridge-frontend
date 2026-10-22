import {createHash,createHmac,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {currentWalletIdentity} from "@/lib/auth-server";
import {validSameOrigin} from "@/lib/wallet-auth";
import {validBusinessApplicationName,validBusinessOnboarding} from "@/lib/business-onboarding";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const MAX_BODY=16384;
const safeHeaders={"cache-control":"private, no-store","x-content-type-options":"nosniff"};
const PATH="/v1/account/business-onboarding";
function serviceOrigin():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||
  "https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||
   url.hash||url.search||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
async function invoke(request:Request,method:"GET"|"POST"){
 const session=await currentWalletIdentity();
 if(!session)return NextResponse.json({code:"SESSION_REQUIRED"},{status:401,headers:safeHeaders});
 if(new URL(request.url).search)return NextResponse.json({code:"INVALID_QUERY"},{status:400,headers:safeHeaders});
 if(method==="POST"&&!validSameOrigin(request))
  return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers:safeHeaders});
 const secret=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const origin=serviceOrigin();
 if(!secret||Buffer.byteLength(secret,"utf8")<32||!origin)
  return NextResponse.json({code:"ONBOARDING_UNAVAILABLE"},{status:503,headers:safeHeaders});
 let body="";
 if(method==="POST"){
  if(!request.headers.get("content-type")?.startsWith("application/json")||
   Number(request.headers.get("content-length")??0)>512)
   return NextResponse.json({code:"INVALID_BUSINESS_NAME"},{status:400,headers:safeHeaders});
  try{
   const text=await request.text();
   if(!text||Buffer.byteLength(text,"utf8")>512)throw Error("invalid length");
   const parsed:unknown=JSON.parse(text);
   if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
    Object.keys(parsed).length!==1||!("display_name" in parsed)||
    !validBusinessApplicationName((parsed as {display_name:unknown}).display_name))
    throw Error("Invalid data");
   body=JSON.stringify(parsed);
  }catch{return NextResponse.json({code:"INVALID_BUSINESS_NAME"},{status:400,headers:safeHeaders});}
 }
 const id=method==="POST"?randomUUID():"";
 const digest=method==="POST"?createHash("sha256").update(body,"utf8").digest("hex"):"";
 const timestamp=String(Math.floor(Date.now()/1000));
 const mac=createHmac("sha256",secret).update(
  "stealthbridge-business-onboarding-v1\n"+method+"\n"+PATH+"\n"+
  session.address+"\n"+timestamp+"\n"+id+"\n"+digest+"\n","utf8"
 ).digest("hex");
 const outgoing:Record<string,string>={
  accept:"application/json",
  "x-stealthbridge-account":session.address,
  "x-stealthbridge-issued-at":timestamp,
  "x-stealthbridge-signature":mac
 };
 if(method==="POST"){
  outgoing["content-type"]="application/json";
  outgoing["x-stealthbridge-request-id"]=id;
 }
 try{
  const response=await fetch(new URL(PATH,origin),{
   method,headers:outgoing,redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(9000),...(method==="POST"?{body}:{})
  });
  if(response.status===429)return NextResponse.json({code:"PENDING_APPLICATION_LIMIT"},
   {status:429,headers:safeHeaders});
  if(response.status===409)return NextResponse.json({code:"REPEATED_APPLICATION"},
   {status:409,headers:safeHeaders});
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json"))
   throw Error("Backend unavailable");
  const declared=response.headers.get("content-length");
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY))
   throw Error("Oversized response");
  const reader=response.body?.getReader();if(!reader)throw Error("Missing body");
  let size=0;const parts:Uint8Array[]=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BODY)throw Error("Oversized response");
    parts.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validBusinessOnboarding(data,session.address)||
   method==="POST"&&(data as {applications:unknown[]}).applications.length!==1)
   throw Error("Invalid private backend response");
  return NextResponse.json(data,{status:method==="POST"?201:200,headers:safeHeaders});
 }catch{
  return NextResponse.json({code:"ONBOARDING_UNAVAILABLE"},{status:503,headers:safeHeaders});
 }
}
export async function GET(request:Request){return invoke(request,"GET");}
export async function POST(request:Request){return invoke(request,"POST");}
