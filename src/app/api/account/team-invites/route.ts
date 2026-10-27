import {createHash,createHmac,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {currentWalletIdentity} from "@/lib/auth-server";
import {validSameOrigin} from "@/lib/wallet-auth";
import {validTeamInvitationDirectory,validTeamInviteAction} from "@/lib/team-invites";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const ENDPOINT="/v1/account/team-invites";
const MAX_RESPONSE=24000;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const NIL="00000000-0000-0000-0000-000000000000";
const noStore={"cache-control":"private, no-store","x-content-type-options":"nosniff"};

function backendOrigin():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||
  "https://stealthbridge-backend.vercel.app";
 try{
  const uri=new URL(raw);
  if(uri.protocol!=="https:"||uri.username||uri.password||uri.hash||
     uri.search||uri.pathname!=="/")return null;
  if(uri.hostname!=="stealthbridge-backend.vercel.app"&&
    !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(uri.hostname))return null;
  return uri;
 }catch{return null;}
}
async function proxy(request:Request,method:"GET"|"POST"){
 const identity=await currentWalletIdentity();
 if(!identity)return NextResponse.json({code:"SESSION_REQUIRED"},{status:401,headers:noStore});
 if(process.env.STEALTHBRIDGE_TEAM_INVITES_ENABLED!=="true")
  return NextResponse.json({code:"INVITATIONS_NOT_RELEASED"},{status:503,headers:noStore});
 // An exact, canonical query is bound to the HMAC request-id field so one
 // business cannot receive a misleading first page of another business's invites.
 const query=new URL(request.url).search;
 const candidate=query.startsWith("?organization_id=")?query.slice("?organization_id=".length):"";
 if((method==="POST"&&query)||
   (method==="GET"&&query&&(!UUID.test(candidate)||candidate===NIL||
     query!=="?organization_id="+candidate)))
  return NextResponse.json({code:"INVALID_QUERY"},{status:400,headers:noStore});
 const organizationId=method==="GET"?candidate:"";
 if(method==="POST"&&!validSameOrigin(request))
  return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers:noStore});
 const key=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const upstream=backendOrigin();
 if(!key||Buffer.byteLength(key,"utf8")<32||!upstream)
  return NextResponse.json({code:"INVITATIONS_NOT_CONFIGURED"},{status:503,headers:noStore});
 let body="";let nonce=organizationId;
 if(method==="POST"){
  if(!request.headers.get("content-type")?.startsWith("application/json")||
    Number(request.headers.get("content-length")??0)>400)
   return NextResponse.json({code:"INVALID_INVITATION_ACTION"},{status:400,headers:noStore});
  try{
   const raw=await request.text();
   if(!raw||Buffer.byteLength(raw)>400)throw Error("size");
   const value:unknown=JSON.parse(raw);
   if(!validTeamInviteAction(value))throw Error("shape");
   body=JSON.stringify(value);
   nonce=randomUUID();
  }catch{
   return NextResponse.json({code:"INVALID_INVITATION_ACTION"},{status:400,headers:noStore});
  }
 }
 const stamp=String(Math.floor(Date.now()/1000));
 const digest=body?createHash("sha256").update(body,"utf8").digest("hex"):"";
 const signed="stealthbridge-team-invites-v1\n"+method+"\n"+ENDPOINT+"\n"+
  identity.address+"\n"+stamp+"\n"+nonce+"\n"+digest+"\n";
 const sig=createHmac("sha256",key).update(signed,"utf8").digest("hex");
 const headers:Record<string,string>={
  accept:"application/json",
  "x-stealthbridge-account":identity.address,
  "x-stealthbridge-issued-at":stamp,
  "x-stealthbridge-signature":sig
 };
 if(body){
  headers["content-type"]="application/json";
  headers["x-stealthbridge-request-id"]=nonce;
 }
 try{
  const upstreamUrl=new URL(ENDPOINT,upstream);
  if(organizationId)upstreamUrl.searchParams.set("organization_id",organizationId);
  const response=await fetch(upstreamUrl,{
   method,headers,cache:"no-store",redirect:"error",
   signal:AbortSignal.timeout(9000),
   ...(body?{body}:{})
  });
  if(method==="POST"&&response.status===204)
   return new Response(null,{status:204,headers:noStore});
  if([400,401,403,409].includes(response.status))
   return NextResponse.json({code:"INVITATION_REJECTED"},
    {status:response.status,headers:noStore});
  if(method!=="GET"||!response.ok||
    !response.headers.get("content-type")?.includes("application/json"))
   throw Error("status");
  const length=response.headers.get("content-length");
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE))throw Error("large");
  const reader=response.body?.getReader();if(!reader)throw Error("body");
  let size=0;const pieces:Uint8Array[]=[];
  try{
   for(;;){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_RESPONSE)throw Error("large");
    pieces.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const piece of pieces){bytes.set(piece,offset);offset+=piece.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validTeamInvitationDirectory(data,identity.address)||
    (organizationId&&(
      data.received.length!==0||data.received_more||
      data.sent.some(row=>row.organization_id!==organizationId))))
   throw Error("unverified");
  return NextResponse.json(data,{headers:noStore});
 }catch{
  return NextResponse.json({code:"INVITATIONS_UNAVAILABLE"},{status:503,headers:noStore});
 }
}
export async function GET(request:Request){return proxy(request,"GET");}
export async function POST(request:Request){return proxy(request,"POST");}
