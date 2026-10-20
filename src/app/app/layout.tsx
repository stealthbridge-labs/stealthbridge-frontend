import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {AccountShell} from "@/components/account-shell";
export const dynamic="force-dynamic";
export const metadata:Metadata={robots:{index:false,follow:false}};
export default async function AppLayout({children}:{children:React.ReactNode}){
 const identity=await requireWalletIdentity();
 return <AccountShell address={identity.address}>{children}</AccountShell>;
}
