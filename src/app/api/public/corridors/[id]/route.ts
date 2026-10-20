import {NextResponse} from "next/server";
import {validCustomerCorridorPage} from "@/lib/customer-corridors";
export const dynamic="force-dynamic";
const MAX_BYTES=4096;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
function safeOrigin():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
/** Consented, bounded, GET-only verification of operator-enabled route metadata. */
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;
 const requested=new URL(request.url);
 if(!UUID.test(id)||requested.search)
  return NextResponse.json({code:"INVALID_CORRIDOR_ID"},{status:400,
   headers:{"cache-control":"no-store"}});
 const origin=safeOrigin();
 if(!origin)return NextResponse.json({code:"CATALOG_NOT_CONFIGURED"},{status:503,
  headers:{"cache-control":"no-store"}});
 try{
  const url=new URL("/v1/corridors/"+id.toLowerCase(),origin);
  const response=await fetch(url,{method:"GET",headers:{accept:"application/json"},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8500)});
  if(response.status===404)return NextResponse.json({code:"CORRIDOR_NO_LONGER_AVAILABLE"},
   {status:404,headers:{"cache-control":"no-store"}});
  const length=response.headers.get("content-length");
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json")||
   (length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)))
    throw Error("CORRIDOR_UPSTREAM_UNAVAILABLE");
  const reader=response.body?.getReader();
  if(!reader)throw Error("NO_RESPONSE_BODY");
  const parts:Uint8Array[]=[];let size=0;
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BYTES)throw Error("OVERSIZED_RESPONSE");
    parts.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validCustomerCorridorPage({items:[value],next_cursor:null})||
     (value as {id:string}).id.toLowerCase()!==id.toLowerCase())
    throw Error("INVALID_CORRIDOR");
  return NextResponse.json(value,{headers:{"cache-control":"no-store",
   "x-content-type-options":"nosniff"}});
 }catch{
  return NextResponse.json({code:"CORRIDOR_PREFLIGHT_UNAVAILABLE"},
   {status:503,headers:{"cache-control":"no-store"}});
 }
}
