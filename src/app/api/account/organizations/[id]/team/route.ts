import {createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {currentWalletIdentity} from "@/lib/auth-server";
import {validOrganizationTeam} from "@/lib/organization-team";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const MAX_BYTES=32768;
const safeHeaders={"cache-control":"private, no-store","x-content-type-options":"nosniff"};

function allowedBackend():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||
  "https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.hash||
   url.search||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
export async function GET(
 request:Request,{params}:{params:Promise<{id:string}>}
){
 const session=await currentWalletIdentity();
 if(!session)return NextResponse.json({code:"SESSION_REQUIRED"},
  {status:401,headers:safeHeaders});
 const {id}=await params;
 if(!uuid.test(id)||id==="00000000-0000-0000-0000-000000000000")
  return NextResponse.json({code:"INVALID_ORGANIZATION"},{status:400,headers:safeHeaders});
 const search=new URL(request.url).searchParams;
 const keys=[...search.keys()];
 if(keys.some(key=>key!=="after"||search.getAll(key).length!==1))
  return NextResponse.json({code:"INVALID_CURSOR"},{status:400,headers:safeHeaders});
 const after=search.get("after");
 if(after!==null&&canonicalStellarAccountAddress(after)!==after)
  return NextResponse.json({code:"INVALID_CURSOR"},{status:400,headers:safeHeaders});
 const secret=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const backend=allowedBackend();
 if(!secret||Buffer.byteLength(secret,"utf8")<32||!backend)
  return NextResponse.json({code:"TEAM_NOT_CONFIGURED"},{status:503,headers:safeHeaders});
 const path="/v1/account/organizations/"+id+"/team";
 const suffix=after?"?after="+after:"";
 const stamp=String(Math.floor(Date.now()/1000));
 const signed="stealthbridge-organization-team-v1\nGET\n"+path+suffix+
  "\n"+session.address+"\n"+stamp+"\n";
 const signature=createHmac("sha256",secret).update(signed,"utf8").digest("hex");
 try{
  const response=await fetch(new URL(path+suffix,backend),{
   method:"GET",cache:"no-store",redirect:"error",
   headers:{accept:"application/json","x-stealthbridge-account":session.address,
    "x-stealthbridge-issued-at":stamp,"x-stealthbridge-signature":signature},
   signal:AbortSignal.timeout(7500)
  });
  if([401,403,404].includes(response.status))
   return NextResponse.json({code:"TEAM_ACCESS_DENIED"},
    {status:response.status===401?401:404,headers:safeHeaders});
  const length=response.headers.get("content-length");
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json")||
   length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES))
   throw Error("UPSTREAM_UNAVAILABLE");
  const reader=response.body?.getReader();if(!reader)throw Error("NO_BODY");
  let size=0;const chunks:Uint8Array[]=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;
    if(size>MAX_BYTES)throw Error("TOO_LARGE");
    chunks.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validOrganizationTeam(data,id,session.address))
   throw Error("UNVERIFIED_TEAM");
  if(after&&data.members.some(member=>member.account_address<=after))
   throw Error("PAGE_OUT_OF_ORDER");
  return NextResponse.json(data,{headers:safeHeaders});
 }catch{
  return NextResponse.json({code:"TEAM_UNAVAILABLE"},{status:503,headers:safeHeaders});
 }
}
