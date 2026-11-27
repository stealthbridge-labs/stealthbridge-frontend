import {NextRequest,NextResponse} from "next/server";
import {AUTH_COOKIE_OPTIONS,CHALLENGE_COOKIE,SESSION_COOKIE,createSession,
 validatedChallenge,validSameOrigin,verifyChallengeTransaction,verifyWalletMessage} from "@/lib/wallet-auth";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
export async function POST(request:NextRequest){
 if(!validSameOrigin(request))return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,headers});
 if(!request.headers.get("content-type")?.startsWith("application/json")||
  Number(request.headers.get("content-length")??0)>6144)
  return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 let data:unknown;
 try{const text=await request.text();if(text.length>6144)throw Error();data=JSON.parse(text);}catch{
  return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 }
 if(!data||typeof data!=="object"||Array.isArray(data))
  return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 const {address,signature,signed_transaction:signedTransaction}=(data as Record<string,unknown>);
 // Exactly one proof: a SEP-53 message signature, or a signed SEP-10 style challenge transaction.
 if(typeof address!=="string"||(typeof signature==="string")===(typeof signedTransaction==="string"))
  return NextResponse.json({code:"INVALID_INPUT"},{status:400,headers});
 const challenge=validatedChallenge(request.cookies.get(CHALLENGE_COOKIE)?.value,address,new URL(request.url).origin);
 const proven=!!challenge&&(typeof signature==="string"
  ?verifyWalletMessage(address,challenge.message,signature)
  :verifyChallengeTransaction(challenge,signedTransaction as string));
 if(!challenge||!proven)
  return NextResponse.json({code:"SIGNATURE_REJECTED"},{status:401,headers});
 const session=createSession(challenge);
 if(!session)return NextResponse.json({code:"SESSION_UNAVAILABLE"},{status:503,headers});
 const response=NextResponse.json({authenticated:true,address:challenge.address},{headers});
 response.cookies.delete(CHALLENGE_COOKIE);
 response.cookies.set(SESSION_COOKIE,session,{...AUTH_COOKIE_OPTIONS,maxAge:7200});
 return response;
}
