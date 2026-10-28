import {NextResponse} from "next/server";
import {assertBusinessRouteIds,validCorridorBatch} from "@/lib/business-batch";
export const dynamic="force-dynamic";
const HEADERS={"cache-control":"no-store","x-content-type-options":"nosniff"};
function backendOrigin():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||
  "https://stealthbridge-backend.vercel.app";
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||
   u.pathname!=="/"||u.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(u.hostname))return null;
  return u;
 }catch{return null;}
}
/** Deliberately public GET-only metadata; no cookies, CSV, financial writes or PII. */
export async function GET(request:Request){
 const url=new URL(request.url);
 if([...url.searchParams.keys()].length!==1||url.searchParams.getAll("ids").length!==1)
  return NextResponse.json({code:"INVALID_BATCH_IDS"},{status:400,headers:HEADERS});
 let ids:string[];
 try{ids=assertBusinessRouteIds((url.searchParams.get("ids")??"").split(","));}
 catch{return NextResponse.json({code:"INVALID_BATCH_IDS"},{status:400,headers:HEADERS});}
 const backend=backendOrigin();
 if(!backend)return NextResponse.json({code:"BACKEND_NOT_CONFIGURED"},{status:503,headers:HEADERS});
 try{
  const upstream=await fetch(new URL("/v1/corridors/batch?ids="+ids.join(","),backend),{
   method:"GET",headers:{accept:"application/json"},cache:"no-store",redirect:"error",
   signal:AbortSignal.timeout(9000)
  });
  const len=upstream.headers.get("content-length");
  if(!upstream.ok||!upstream.headers.get("content-type")?.includes("application/json")||
   len!==null&&(!/^\d+$/.test(len)||Number(len)>4096)||!upstream.body)
   throw Error("upstream");
  const reader=upstream.body.getReader();const chunks:Uint8Array[]=[];let total=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;if(total>4096)throw Error("too big");
   chunks.push(value);
  }}finally{reader.releaseLock();}
  const data=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
  const payload:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(data));
  if(!validCorridorBatch(payload,ids))throw Error("invalid");
  return NextResponse.json(payload,{headers:HEADERS});
 }catch{
  return NextResponse.json({code:"BATCH_CATALOG_UNAVAILABLE"},{status:503,headers:HEADERS});
 }
}
