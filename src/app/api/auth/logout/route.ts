import {NextRequest,NextResponse} from "next/server";
import {CHALLENGE_COOKIE,SESSION_COOKIE,validSameOrigin} from "@/lib/wallet-auth";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!validSameOrigin(request))return NextResponse.json({code:"ORIGIN_REJECTED"},{status:403,
  headers:{"cache-control":"no-store"}});
 const response=NextResponse.json({authenticated:false},{headers:{"cache-control":"no-store"}});
 response.cookies.delete(SESSION_COOKIE);
 response.cookies.delete(CHALLENGE_COOKIE);
 return response;
}
