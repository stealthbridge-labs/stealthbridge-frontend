/** Signed, same-origin ciphertext relay. Only encrypted blobs cross this edge.
 * It does not accept any plain recipient, amount, reference, passphrase, note,
 * wallet secret or transaction instruction. Disabled until operator release. */
import {createHash,createHmac,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {currentWalletIdentity} from "@/lib/auth-server";
import {validSameOrigin} from "@/lib/wallet-auth";
import {validEncryptedCustomerDraft,validEncryptedDraftDirectory} from "@/lib/private-draft-vault";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const common={"cache-control":"private, no-store","x-content-type-options":"nosniff"};
const PATH="/v1/account/drafts";
const DOMAIN="stealthbridge-customer-ciphertext-vault-v1";
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
function backendUrl():URL|null{
 const raw=process.env.STEALTHBRIDGE_API_URL?.trim()||"https://stealthbridge-backend.vercel.app";
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  if(url.hostname!=="stealthbridge-backend.vercel.app"&&
    !/^stealthbridge-backend-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
function isRecord(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function validatePayload(method:"PUT"|"DELETE",input:unknown):boolean{
 if(!isRecord(input)||typeof input.id!=="string"||!UUID.test(input.id)||
  !Number.isSafeInteger(input.expected_revision)||Number(input.expected_revision)<0||Number(input.expected_revision)>999999)return false;
 if(method==="DELETE")return Object.keys(input).length===2&&Number(input.expected_revision)>0;
 return Object.keys(input).length===3&&validEncryptedCustomerDraft(input.encrypted);
}
async function relay(request:Request,method:"GET"|"PUT"|"DELETE"){
 const identity=await currentWalletIdentity();
 if(!identity)return NextResponse.json({code:"SESSION_REQUIRED"},{status:401,headers:common});
 if(process.env.STEALTHBRIDGE_CUSTOMER_DRAFTS_ENABLED!=="true")
  return NextResponse.json({code:"ENCRYPTED_DRAFTS_NOT_RELEASED"},{status:503,headers:common});
 if(new URL(request.url).search)return NextResponse.json({code:"INVALID_QUERY"},{status:400,headers:common});
 if(method!=="GET"&&!validSameOrigin(request))
  return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers:common});
 const secret=process.env.STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET;
 const backend=backendUrl();
 if(!secret||Buffer.byteLength(secret)<32||!backend)
  return NextResponse.json({code:"DRAFT_VAULT_NOT_CONFIGURED"},{status:503,headers:common});
 let body="";
 if(method!=="GET"){
  if(!request.headers.get("content-type")?.startsWith("application/json")||
    Number(request.headers.get("content-length")??0)>6000)
   return NextResponse.json({code:"INVALID_CIPHERTEXT"},{status:400,headers:common});
  try{
   const raw=await request.text();
   if(Buffer.byteLength(raw,"utf8")>6000||raw.length===0)throw Error("OVERSIZE");
   const parsed:unknown=JSON.parse(raw);
   if(!validatePayload(method,parsed))throw Error("MALFORMED");
   // Reserialize only a strictly validated envelope. Unknown/plaintext
   // properties cannot be forwarded to the database or be logged.
   body=JSON.stringify(parsed);
  }catch{return NextResponse.json({code:"INVALID_CIPHERTEXT"},{status:400,headers:common});}
 }
 const stamp=String(Math.floor(Date.now()/1000));
 const nonce=method==="GET"?"":randomUUID();
 const digest=method==="GET"?"":createHash("sha256").update(body).digest("hex");
 const signature=createHmac("sha256",secret).update(`${DOMAIN}\n${method}\n${PATH}\n${identity.address}\n${stamp}\n${nonce}\n${digest}\n`).digest("hex");
 const signed:Record<string,string>={accept:"application/json",
  "x-stealthbridge-account":identity.address,"x-stealthbridge-issued-at":stamp,
  "x-stealthbridge-signature":signature};
 if(method!=="GET"){
  signed["x-stealthbridge-nonce"]=nonce;signed["content-type"]="application/json";
 }
 try{
  const response=await fetch(new URL(PATH,backend),{
   method,headers:signed,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000),
   ...(method==="GET"?{}:{body})
  });
  if(method!=="GET"){
   if(response.status===409)return NextResponse.json({code:"CONCURRENT_DRAFT_CHANGE"},{status:409,headers:common});
   if(response.status===204)return new NextResponse(null,{status:204,headers:common});
   throw Error("UNAVAILABLE");
  }
  if(!response.ok||!response.headers.get("content-type")?.includes("application/json"))throw Error("UNAVAILABLE");
  const sizeHeader=response.headers.get("content-length");
  if(sizeHeader!==null&&(!/^\d+$/.test(sizeHeader)||Number(sizeHeader)>70000))throw Error("OVERSIZED");
  const reader=response.body?.getReader();if(!reader)throw Error("EMPTY");
  let size=0;const parts:Uint8Array[]=[];
  try{
   for(;;){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>70000)throw Error("OVERSIZED");
    parts.push(value);
   }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!validEncryptedDraftDirectory(data,identity.address))throw Error("INVALID_STORAGE_RESPONSE");
  return NextResponse.json(data,{headers:common});
 }catch{return NextResponse.json({code:"DRAFT_VAULT_UNAVAILABLE"},{status:503,headers:common});}
}
export async function GET(request:Request){return relay(request,"GET");}
export async function PUT(request:Request){return relay(request,"PUT");}
export async function DELETE(request:Request){return relay(request,"DELETE");}
