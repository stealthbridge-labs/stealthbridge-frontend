import {createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {currentWalletIdentity} from "@/lib/auth-server";
import {validAccountDirectory} from "@/lib/account-directory";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const MAX_BODY=32768;
const safeHeaders={"cache-control":"private, no-store","x-content-type-options":"nosniff"};
function backendOrigin():URL|null {
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app";
 try {
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")
   return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
export async function GET(request:Request){
 const user=await currentWalletIdentity();
 if(!user)return NextResponse.json({code:"SESSION_REQUIRED"},{status:401,headers:safeHeaders});
 if(new URL(request.url).search)
  return NextResponse.json({code:"INVALID_QUERY"},{status:400,headers:safeHeaders});
 const secret=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const backend=backendOrigin();
 if(!secret||Buffer.byteLength(secret,"utf8")<32||!backend)
  return NextResponse.json({code:"DIRECTORY_NOT_CONFIGURED"},{status:503,headers:safeHeaders});
 try{
  const stamp=String(Math.floor(Date.now()/1000));
  const message="stealthbridge-account-directory-v1\nGET\n/v1/account/directory\n"+
    user.address+"\n"+stamp+"\n";
  const signature=createHmac("sha256",secret).update(message,"utf8").digest("hex");
  const url=new URL("/v1/account/directory",backend);
  const response=await fetch(url,{method:"GET",cache:"no-store",redirect:"error",
   signal:AbortSignal.timeout(6500),headers:{
    accept:"application/json","x-stealthbridge-account":user.address,
    "x-stealthbridge-issued-at":stamp,"x-stealthbridge-signature":signature
   }});
  const length=response.headers.get("content-length");
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json")||
    length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BODY))
   throw Error("UPSTREAM_UNAVAILABLE");
  const reader=response.body?.getReader();if(!reader)throw Error("EMPTY");
  let size=0;const chunks:Uint8Array[]=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BODY)throw Error("OVERSIZED");
    chunks.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validAccountDirectory(data,user.address))throw Error("INVALID_DIRECTORY");
  return NextResponse.json(data,{headers:safeHeaders});
 }catch{
  return NextResponse.json({code:"DIRECTORY_UNAVAILABLE"},{status:503,headers:safeHeaders});
 }
}
