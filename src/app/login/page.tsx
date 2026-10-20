import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft,LockKeyhole} from "lucide-react";
import {Brand} from "@/components/brand";
import {WalletSignIn} from "@/components/wallet-sign-in";
import {currentWalletIdentity} from "@/lib/auth-server";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Sign in — StealthBridge",description:"Sign in to your Stellar Testnet StealthBridge workspace securely.",robots:{index:false,follow:false}};
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}){
 const params=await searchParams;
 const destination=params.next==="/app/send"||params.next==="/app/business"?params.next:"/app";
 const identity=await currentWalletIdentity();
 if(identity)redirect(destination);
 return <div className="access-page">
  <header className="access-header"><Brand/><Link href="/" className="access-back"><ArrowLeft size={16} aria-hidden/> Back to StealthBridge</Link></header>
  <main id="main-content" className="access-main">
   <div className="access-copy"><span className="section-index">STEALTHBRIDGE / YOUR ACCOUNT</span>
    <h1>Your world of payments, <em>one secure space.</em></h1>
    <p>Explore what StealthBridge can do for you, then access your personal or business workspace when you're ready. Your account is yours—not your wallet address on a public marketing page.</p>
    <div className="access-trust"><LockKeyhole size={17} aria-hidden/> A real signature is required to create a signed-in session.</div>
   </div>
   <WalletSignIn destination={destination}/>
  </main>
 </div>;
}
