import {NextResponse} from "next/server";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";
import {validClassicRecipientPresence} from "@/lib/classic-recipient-presence";
export const dynamic="force-dynamic";
const MAX_BODY=4096;
function backend():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
   !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
/** Inspect a public C-address only after the visitor explicitly requests it. */
export async function GET(_request:Request,context:{params:Promise<{address:string}>}){
 const {address}=await context.params;
 if(canonicalStellarAccountAddress(address)!==address)return NextResponse.json({code:"INVALID_CLASSIC_ACCOUNT"},{status:400});
 const origin=backend();
 if(!origin)return NextResponse.json({code:"BACKEND_NOT_CONFIGURED"},{status:503});
 try{
  const url=new URL("/v1/wallet/classic-recipient/"+address,origin);
  const response=await fetch(url,{method:"GET",headers:{accept:"application/json"},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8500)});
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json")||
   Number(response.headers.get("content-length")??0)>MAX_BODY)
   throw Error("UNAVAILABLE");
  const reader=response.body?.getReader();
  if(!reader)throw Error("NO_BODY");
  const chunks:Uint8Array[]=[];let size=0;
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>MAX_BODY)throw Error("TOO_LARGE");
    chunks.push(value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const result:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validClassicRecipientPresence(result,address))throw Error("INVALID_EVIDENCE");
  return NextResponse.json(result,{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
 }catch{
  return NextResponse.json({code:"CLASSIC_RECIPIENT_CHECK_UNAVAILABLE"},{status:503,
   headers:{"cache-control":"no-store"}});
 }
}
