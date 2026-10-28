import {NextResponse} from "next/server";
import {validCustomerCorridorPreflight} from "@/lib/corridor-preflight";
export const dynamic="force-dynamic";
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HEADERS={"cache-control":"no-store","x-content-type-options":"nosniff"};
function backendOrigin():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||
  "https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.hash||url.search||
   url.pathname!=="/"||
   url.hostname!=="stealthbridge-backend.vercel.app"&&
    !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
/** Public route ID only. Never proxy wallet identities, amounts or recipients. */
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;
 if(!UUID.test(id)||new URL(request.url).search)
  return NextResponse.json({code:"INVALID_ROUTE"},{status:400,headers:HEADERS});
 const base=backendOrigin();
 if(!base)return NextResponse.json({code:"BACKEND_NOT_CONFIGURED"},{status:503,headers:HEADERS});
 try{
  const res=await fetch(new URL("/v1/corridors/"+id.toLowerCase()+"/preflight",base),{
   method:"GET",cache:"no-store",redirect:"error",
   headers:{accept:"application/json"},signal:AbortSignal.timeout(9000)
  });
  if(res.status===404)return NextResponse.json({code:"ROUTE_UNAVAILABLE"},{status:404,headers:HEADERS});
  const declared=res.headers.get("content-length");
  if(!res.ok||!res.headers.get("content-type")?.includes("application/json")||
    declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>4096))
   throw Error("upstream");
  if(!res.body)throw Error("empty");
  const reader=res.body.getReader();let size=0;const parts:Uint8Array[]=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>4096)throw Error("oversized");
    parts.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;
  for(const item of parts){bytes.set(item,at);at+=item.byteLength;}
  const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validCustomerCorridorPreflight(value,id))throw Error("invalid preflight");
  return NextResponse.json(value,{headers:HEADERS});
 }catch{
  return NextResponse.json({code:"PREFLIGHT_UNAVAILABLE"},{status:503,headers:HEADERS});
 }
}
