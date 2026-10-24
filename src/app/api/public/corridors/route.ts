import {NextResponse} from "next/server";
import {validCustomerCorridorPage,validCustomerCorridorFilters} from "@/lib/customer-corridors";
export const dynamic="force-dynamic";
const MAX_BYTES=32768;
function verifiedBackend():URL|null {
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app";
 try {
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
/** Public metadata only: no session, customer identity, FX, payout, fee, or transaction records. */
export async function GET(request:Request){
 const incoming=new URL(request.url);
 const params=incoming.searchParams;
 const after=params.get("after");
 const fields=["after","origin_country","destination_country","privacy_rail"] as const;
 const filters=Object.fromEntries(
  ["origin_country","destination_country","privacy_rail"]
   .filter(key=>params.has(key))
   .map(key=>[key,params.get(key)])
 );
 if([...params.keys()].some(key=>!fields.includes(key as typeof fields[number])||
      params.getAll(key).length!==1)||
    (after!==null&&!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(after))||
    !validCustomerCorridorFilters(filters))
  return NextResponse.json({code:"INVALID_CORRIDOR_FILTERS"},{status:400,
   headers:{"cache-control":"no-store"}});
 const backend=verifiedBackend();
 if(!backend)return NextResponse.json({code:"CATALOG_NOT_CONFIGURED"},{status:503,
  headers:{"cache-control":"no-store"}});
 try {
  const url=new URL("/v1/corridors/page?limit=25",backend);
  if(after)url.searchParams.set("after",after.toLowerCase());
  for(const name of ["origin_country","destination_country","privacy_rail"] as const){
   if(filters[name])url.searchParams.set(name,filters[name]);
  }
  const response=await fetch(url,{method:"GET",headers:{accept:"application/json"},
   cache:"no-store",redirect:"error",signal:AbortSignal.timeout(9000)});
  const length=response.headers.get("content-length");
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json")||
   (length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)))
   throw Error("UNAVAILABLE");
  const reader=response.body?.getReader();
  if(!reader)throw Error("EMPTY_BODY");
  const chunks:Uint8Array[]=[];let size=0;
  try {
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BYTES)throw Error("TOO_LARGE");
    chunks.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let index=0;
  for(const chunk of chunks){bytes.set(chunk,index);index+=chunk.byteLength;}
  const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validCustomerCorridorPage(value))throw Error("INVALID_CATALOG");
  return NextResponse.json(value,{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
 }catch{
  return NextResponse.json({code:"CORRIDOR_CATALOG_UNAVAILABLE"},{status:503,
   headers:{"cache-control":"no-store"}});
 }
}
