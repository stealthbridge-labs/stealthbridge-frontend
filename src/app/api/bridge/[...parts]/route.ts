import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
const allowed = new Set(["health","ready","v1/network","v1/capabilities","v1/corridors","v1/corridors/page","v1/observer","v1/contracts"]);
export async function GET(_request:NextRequest,context:{params:Promise<{parts:string[]}>}){
 if(process.env.STEALTHBRIDGE_SITE_MODE!=="preview") return NextResponse.json({code:"PREVIEW_DISABLED"},{status:404});
 const {parts}=await context.params;
 const path=parts.join("/");
 // Only the corridor-page route may forward validated discovery parameters.
 const search=_request.nextUrl.searchParams;
 if(path==="v1/corridors/page"){
  if([...search.keys()].some(k=>k!=="limit"&&k!=="after") ||
      search.getAll("limit").length>1 || search.getAll("after").length>1)
   return NextResponse.json({code:"INVALID_QUERY"},{status:400});
  const rawLimit=search.get("limit");
  const rawCursor=search.get("after");
  if(rawLimit!==null&&(!/^[0-9]{1,3}$/.test(rawLimit)||Number(rawLimit)<1||Number(rawLimit)>100))
   return NextResponse.json({code:"INVALID_LIMIT"},{status:400});
  if(rawCursor!==null&&!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(rawCursor))
   return NextResponse.json({code:"INVALID_CURSOR"},{status:400});
 }else if(search.size) return NextResponse.json({code:"UNSUPPORTED_QUERY"},{status:400});

 if(!allowed.has(path) && !/^v1\/transactions\/[a-f0-9]{64}$/i.test(path) && !/^v1\/corridors\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(path)) return NextResponse.json({code:"NOT_FOUND"},{status:404});
 const base=process.env.STEALTHBRIDGE_API_URL;
 if(!base) return NextResponse.json({code:"API_UNCONFIGURED",message:"Configure STEALTHBRIDGE_API_URL on the frontend server."},{status:503});
 try{
  const url=new URL(base);
  if(!["https:","http:"].includes(url.protocol) || (url.protocol==="http:" && !["localhost","127.0.0.1"].includes(url.hostname)) || url.username || url.password || url.search || url.hash){
   return NextResponse.json({code:"INVALID_BACKEND_URL"},{status:503});
  }
  const destination=new URL(url.toString().replace(/\/$/,"")+"/"+path);
  if(path==="v1/corridors/page") destination.search=search.toString();
  const res=await fetch(destination,{method:"GET",headers:{accept:"application/json"},signal:AbortSignal.timeout(10000),cache:"no-store"});
  // A compromised backend must not cause unbounded buffering on the Next server.
  const maxBytes=256*1024;
  const declared=res.headers.get("content-length");
  if(declared!==null&&Number(declared)>maxBytes)
   return NextResponse.json({code:"UPSTREAM_RESPONSE_TOO_LARGE"},{status:502});
  const reader=res.body?.getReader();
  const chunks:Uint8Array[]=[];
  let size=0;
  if(reader){
   try{
    while(true){
     const {done,value}=await reader.read();
     if(done)break;
     size+=value.byteLength;
     if(size>maxBytes){
      await reader.cancel().catch(()=>{});
      return NextResponse.json({code:"UPSTREAM_RESPONSE_TOO_LARGE"},{status:502});
     }
     chunks.push(value);
    }
   }finally{reader.releaseLock();}
  }
  const bytes=new Uint8Array(size);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const body=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  const headers:Record<string,string>={"cache-control":"no-store","content-type":res.headers.get("content-type")?.includes("json")?"application/json":"text/plain"};
  const requestId=res.headers.get("x-request-id");
  if(requestId&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId))headers["x-request-id"]=requestId;
  const errorCode=res.headers.get("x-error-code");
  if(errorCode&&/^[A-Z][A-Z0-9_]{0,63}$/.test(errorCode))headers["x-error-code"]=errorCode;
  return new NextResponse(body,{status:res.status,headers});
 }catch{
  return NextResponse.json({code:"BACKEND_UNREACHABLE",message:"Unable to reach StealthBridge API."},{status:502,headers:{"cache-control":"no-store"}});
 }
}
