import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,readWalletSession} from "@/lib/wallet-auth";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 const session=readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
 return NextResponse.json(session?{authenticated:true,address:session.address,expires_at_unix:session.expires}:
  {authenticated:false},{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
