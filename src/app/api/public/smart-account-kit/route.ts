import {NextResponse} from "next/server";
import {validSmartAccountKit} from "@/lib/smart-account-kit";
export const dynamic="force-dynamic";
const MAX_BYTES=32768;
const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
function verifiedBackend():URL|null{
 try{
  const url=new URL(process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app");
  if(url.protocol!=="https:"||url.port||url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  return url.hostname==="stealthbridge-backend.vercel.app"||
   /^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname)?url:null;
 }catch{return null;}
}
/** Fixed public infrastructure read. No customer address, cookies or authorization forwarded. */
export async function GET(request:Request){
 if(new URL(request.url).search)return NextResponse.json({code:"INVALID_REQUEST"},{status:400,headers});
 const origin=verifiedBackend();
 if(!origin)return NextResponse.json({code:"BACKEND_NOT_CONFIGURED"},{status:503,headers});
 try{
  const response=await fetch(new URL("/v1/wallet/smart-account-kit",origin),{
   method:"GET",headers:{accept:"application/json"},credentials:"omit",
   cache:"no-store",redirect:"error",signal:AbortSignal.timeout(7000)
  });
  const length=response.headers.get("content-length");
  if(!response.ok||!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type")??"")||
   (length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)))throw Error("UNAVAILABLE");
  const reader=response.body?.getReader();
  if(!reader)throw Error("EMPTY");
  const chunks:Uint8Array[]=[];let size=0;
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BYTES)throw Error("TOO_LARGE");chunks.push(value);
   }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validSmartAccountKit(value))throw Error("INVALID");
  return NextResponse.json(value,{headers});
 }catch{return NextResponse.json({code:"SMART_ACCOUNT_KIT_UNAVAILABLE"},{status:503,headers});}
}
