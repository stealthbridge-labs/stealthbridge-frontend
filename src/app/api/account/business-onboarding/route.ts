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
async function invoke(request:Request,method:"GET"|"POST"|"PATCH"|"DELETE"){
 const session=await currentWalletIdentity();
 if(!session)return NextResponse.json({code:"SESSION_REQUIRED"},{status:401,headers:safeHeaders});
 if(new URL(request.url).search)return NextResponse.json({code:"INVALID_QUERY"},{status:400,headers:safeHeaders});
 if(method!=="GET"&&!validSameOrigin(request))
  return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers:safeHeaders});
 const secret=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const origin=serviceOrigin();
 if(!secret||Buffer.byteLength(secret,"utf8")<32||!origin)
  return NextResponse.json({code:"ONBOARDING_UNAVAILABLE"},{status:503,headers:safeHeaders});
 let body="";
 if(method!=="GET"){
  if(!request.headers.get("content-type")?.startsWith("application/json")||
   Number(request.headers.get("content-length")??0)>512)
   return NextResponse.json({code:"INVALID_BUSINESS_NAME"},{status:400,headers:safeHeaders});
  try{
   const text=await request.text();
   if(!text||Buffer.byteLength(text,"utf8")>512)throw Error("invalid length");
   const parsed:unknown=JSON.parse(text);
   if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))
    throw Error("Invalid data");
   const data=parsed as Record<string,unknown>;
   const actual=Object.keys(data).sort().join(",");
   const validId=(id:unknown)=>typeof id==="string"&&
    /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id)&&
    id!=="00000000-0000-0000-0000-000000000000";
   if(method==="POST"&&(actual!=="display_name"||
     !validBusinessApplicationName(data.display_name))||
    method==="PATCH"&&(actual!=="display_name,expected_display_name,organization_id"||
     !validId(data.organization_id)||
     !validBusinessApplicationName(data.expected_display_name)||
     !validBusinessApplicationName(data.display_name)||
     data.display_name===data.expected_display_name)||
    method==="DELETE"&&(actual!=="confirm_display_name,organization_id"||
     !validId(data.organization_id)||!validBusinessApplicationName(data.confirm_display_name)))
    throw Error("Invalid data");
   body=JSON.stringify(parsed);
  }catch{return NextResponse.json({code:"INVALID_BUSINESS_NAME"},{status:400,headers:safeHeaders});}
 }
 const id=method!=="GET"?randomUUID():"";
 const digest=method!=="GET"?createHash("sha256").update(body,"utf8").digest("hex"):"";
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
 if(method!=="GET"){
  outgoing["content-type"]="application/json";
  outgoing["x-stealthbridge-request-id"]=id;
 }
 try{
  const response=await fetch(new URL(PATH,origin),{
   method,headers:outgoing,redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(9000),...(method!=="GET"?{body}:{})
  });
  if(response.status===429)return NextResponse.json({code:"PENDING_APPLICATION_LIMIT"},
   {status:429,headers:safeHeaders});
  if(response.status===409)return NextResponse.json({code:
   method==="POST"?"REPEATED_APPLICATION":"APPLICATION_CHANGED_OR_PROTECTED"},
   {status:409,headers:safeHeaders});
  if(response.status===404)return NextResponse.json({code:"APPLICATION_NOT_FOUND"},
   {status:404,headers:safeHeaders});
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
  if(!validBusinessOnboarding(data,session.address))throw Error("Invalid private backend response");
  const result=data as import("@/lib/business-onboarding").BusinessOnboardingEnvelope;
  if(method==="POST"&&result.applications.length!==1||
     method==="PATCH"&&(result.applications.length!==1||
       result.applications[0].id!==(JSON.parse(body) as {organization_id:string}).organization_id||
       result.applications[0].display_name!==(JSON.parse(body) as {display_name:string}).display_name)||
     method==="DELETE"&&result.applications.length!==0)
    throw Error("Inconsistent private backend response");
  return NextResponse.json(data,{status:method==="POST"?201:200,headers:safeHeaders});
 }catch{
  return NextResponse.json({code:"ONBOARDING_UNAVAILABLE"},{status:503,headers:safeHeaders});
 }
}
export async function GET(request:Request){return invoke(request,"GET");}
export async function POST(request:Request){return invoke(request,"POST");}

export async function PATCH(request:Request){return invoke(request,"PATCH");}
export async function DELETE(request:Request){return invoke(request,"DELETE");}
