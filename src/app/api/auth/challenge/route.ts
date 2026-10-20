import {NextResponse} from "next/server";
import {AUTH_COOKIE_OPTIONS,CHALLENGE_COOKIE,createChallenge,isWalletSignInAvailable,validSameOrigin} from "@/lib/wallet-auth";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
export async function POST(request:Request){
 if(!validSameOrigin(request))return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers});
 if(!isWalletSignInAvailable())return NextResponse.json({code:"WALLET_LOGIN_NOT_CONFIGURED"},{status:503,headers});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 if(Number(request.headers.get("content-length")??0)>1024)return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 let input:unknown;
 try{const text=await request.text();if(text.length>1024)throw Error();input=JSON.parse(text);}catch{
  return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 }
 const address=input&&typeof input==="object"&&!Array.isArray(input)?(input as Record<string,unknown>).address:null;
 const challenge=typeof address==="string"?createChallenge(address,new URL(request.url).origin):null;
 if(!challenge)return NextResponse.json({code:"INVALID_ACCOUNT"},{status:400,headers});
 const response=NextResponse.json({message:challenge.message,expires_at_unix:challenge.expires},{headers});
 response.cookies.set(CHALLENGE_COOKIE,challenge.token,{...AUTH_COOKIE_OPTIONS,maxAge:300});
 return response;
}
