"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {getAddress,getNetwork,isConnected,requestAccess,signMessage} from "@stellar/freighter-api";
import {ArrowRight,CheckCircle2,KeyRound,LockKeyhole,ShieldCheck,Wallet} from "lucide-react";
import {Button} from "@/components/ui/button";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";

const PASSPHRASE="Test SDF Network ; September 2015";
export function WalletSignIn({destination}:{destination:"/app"|"/app/send"|"/app/business"}){
 const router=useRouter();
 const [pending,setPending]=useState(false);
 const [error,setError]=useState("");
 const [step,setStep]=useState("");
 async function login(){
  setPending(true);setError("");setStep("Checking your wallet");
  try{
   const installed=await isConnected();
   if(installed.error||!installed.isConnected)throw Error("Freighter isn't available. Install the extension to sign in with your Stellar account.");
   const access=await requestAccess();
   const address=access.error?null:canonicalStellarAccountAddress(access.address??"");
   if(!address)throw Error("Please approve your wallet address in Freighter.");
   const network=await getNetwork();
   if(network.error||network.networkPassphrase!==PASSPHRASE)
    throw Error("Switch Freighter to Stellar Testnet, then try again.");
   const challengeResponse=await fetch("/api/auth/challenge",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"content-type":"application/json"},body:JSON.stringify({address})
   });
   if(!challengeResponse.ok){
    if(challengeResponse.status===503)throw Error("Secure sign-in is not configured on this deployment yet.");
    throw Error("Unable to request a secure sign-in challenge.");
   }
   const challenge:unknown=await challengeResponse.json();
   if(!challenge||typeof challenge!=="object"||typeof (challenge as {message?:unknown}).message!=="string")
    throw Error("An invalid sign-in challenge was returned.");
   const message=(challenge as {message:string}).message;
   setStep("Approve the sign-in message in Freighter");
   // SEP-53 message-signature permission proves address control. No transfer
   // XDR, transaction, user amount or signing seed is ever requested.
   const signed=await signMessage(message,{networkPassphrase:PASSPHRASE,address});
   if(signed.error||!signed.signedMessage||signed.signerAddress!==address)
    throw Error(signed.error?.message??"The wallet didn't sign with the selected account.");
   const [latestAddress,latestNetwork]=await Promise.all([getAddress(),getNetwork()]);
   if(latestAddress.error||canonicalStellarAccountAddress(latestAddress.address??"")!==address||
     latestNetwork.error||latestNetwork.networkPassphrase!==PASSPHRASE)
    throw Error("Your wallet address or network changed during sign-in. Please try again.");
   setStep("Verifying your signature");
   const verified=await fetch("/api/auth/verify",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({address,signature:signed.signedMessage})
   });
   if(!verified.ok)throw Error("The sign-in proof could not be verified. Please try again.");
   router.replace(destination);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to complete sign-in.");}
  finally{setPending(false);setStep("");}
 }
 return <section className="access-methods" aria-label="Sign in methods">
  <div className="access-method featured">
   <div className="access-method-head"><span className="access-method-symbol"><Wallet size={25} aria-hidden/></span>
    <span className="access-method-status"><CheckCircle2 size={14} aria-hidden/> Available on Testnet</span></div>
   <h2>Continue with Stellar wallet</h2>
   <p>Use Freighter to prove that you control your account. You'll approve one sign-in message, not a payment or transaction.</p>
   <Button className="access-signin" disabled={pending} onClick={()=>void login()} type="button">
    {pending?"Signing you in…":"Continue with Freighter"} <ArrowRight size={17} aria-hidden/>
   </Button>
   {step?<p role="status" className="access-feedback">{step}…</p>:null}
   {error?<p role="alert" className="access-error">{error}</p>:null}
  </div>
  <div className="access-method">
   <div className="access-method-head"><span className="access-method-symbol muted"><KeyRound size={24} aria-hidden/></span>
    <span className="access-method-pending">In development</span></div>
   <h2>Passkeys &amp; smart accounts</h2>
   <p>A future account option designed for recovery, team policies and device-based authorization. It isn't available for sign-in until the deployed account contracts and recovery process have been verified.</p>
   <span className="access-unavailable"><LockKeyhole size={16} aria-hidden/> Not yet available</span>
  </div>
  <p className="access-fineprint"><ShieldCheck size={16} aria-hidden/>
   Signing in grants access to an informational Testnet workspace only. It doesn't create a bank account, custody relationship, payment authorization or private transfer.
  </p>
  <p className="access-return">New to StealthBridge? <Link href="/send">Explore personal transfers</Link> or <Link href="/business">see the business product</Link> before signing in.</p>
 </section>;
}
