import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {SESSION_COOKIE,readWalletSession} from "@/lib/wallet-auth";
export async function currentWalletIdentity(){
 const jar=await cookies();
 return readWalletSession(jar.get(SESSION_COOKIE)?.value);
}
export async function requireWalletIdentity(){
 const current=await currentWalletIdentity();
 if(!current)redirect("/login");
 return current;
}
