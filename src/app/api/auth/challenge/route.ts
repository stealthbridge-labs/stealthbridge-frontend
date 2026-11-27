import {NextResponse} from "next/server";
import {AUTH_COOKIE_OPTIONS,CHALLENGE_COOKIE,challengeTransactionXdr,createChallenge,isWalletSignInAvailable,validatedChallenge,validSameOrigin} from "@/lib/wallet-auth";
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
 // Both proofs describe the same challenge: a SEP-53 message, and a SEP-10 style
 // transaction for wallets that can only sign transactions.
 const parsed=validatedChallenge(challenge.token,address as string,new URL(request.url).origin);
 const transaction=parsed?challengeTransactionXdr(parsed):null;
 if(!transaction)return NextResponse.json({code:"CHALLENGE_UNAVAILABLE"},{status:503,headers});
 const response=NextResponse.json({message:challenge.message,transaction,network_passphrase:"Test SDF Network ; September 2015",expires_at_unix:challenge.expires},{headers});
 response.cookies.set(CHALLENGE_COOKIE,challenge.token,{...AUTH_COOKIE_OPTIONS,maxAge:300});
 return response;
}
