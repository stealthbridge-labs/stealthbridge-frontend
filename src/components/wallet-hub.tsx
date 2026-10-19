"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,Globe2,LockKeyhole,ShieldAlert,Wallet} from "lucide-react";
import {Brand} from "@/components/brand";
import {WalletConnect} from "@/components/wallet-connect";
import {Button} from "@/components/ui/button";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";
import {isContractStrKey} from "@/lib/observer-activity";
import {validPublicWalletStatus,type PublicWalletStatus} from "@/lib/public-wallet-status";
import {preparePrivateTransfer} from "@/lib/private-transfer";

type Rail="confidential-token"|"private-payments";
type Flow="send"|"business";
function addressType(input:string):"classic"|"contract"|null{
 const trimmed=input.trim();
 return canonicalStellarAccountAddress(trimmed)?"classic":
  isContractStrKey(trimmed)?"contract":null;
}
export function WalletHub({flow}:{flow:Flow}){
 const [status,setStatus]=useState<PublicWalletStatus|null>(null);
 const [statusError,setStatusError]=useState(false);
 const [revision,setRevision]=useState(0);
 const [connected,setConnected]=useState<string|null>(null);
 const [recipient,setRecipient]=useState("");
 const [amount,setAmount]=useState("");
 const [rail,setRail]=useState<Rail>(flow==="send"?"private-payments":"confidential-token");
 const [reviewed,setReviewed]=useState(false);
 const [smartAccount,setSmartAccount]=useState("");
 const [passkeyState,setPasskeyState]=useState<"unknown"|"checking"|"available"|"unavailable">("unknown");
 const onWalletChange=useCallback((address:string|null)=>setConnected(address),[]);
 const checkPasskeySupport=async()=>{
  setPasskeyState("checking");
  try{
   const credential=window.PublicKeyCredential;
   const ok=typeof credential?.isUserVerifyingPlatformAuthenticatorAvailable==="function"&&
    await credential.isUserVerifyingPlatformAuthenticatorAvailable();
   setPasskeyState(ok?"available":"unavailable");
  }catch{setPasskeyState("unavailable");}
 };
 useEffect(()=>{
  const ctl=new AbortController();
  setStatus(null);setStatusError(false);
  void (async()=>{
   try{
    const response=await fetch("/api/public/status",{
     method:"GET",cache:"no-store",signal:ctl.signal});
    if(!response.ok)throw Error("network");
    const value:unknown=await response.json();
    if(!validPublicWalletStatus(value))throw Error("invalid");
    if(!ctl.signal.aborted)setStatus(value);
   }catch{if(!ctl.signal.aborted)setStatusError(true);}
  })();
  return ()=>ctl.abort();
 },[revision]);
 const target=addressType(recipient);
 const preflight=preparePrivateTransfer({
  sender:connected,recipient,amount,rail,backendTestnetFresh:Boolean(status)
 });
 const canReview=preflight.validLocalDraft;
 const review=()=>setReviewed(true);
 const failReason=rail==="private-payments"?
  "Stellar Private Payments proof integration, pool policy and withdrawal safety are not verified.":
  "Confidential Token verifier, issuer permissions and asset deployment are not verified.";
 return <div className="workspace-page">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden/> Stellar Testnet</span>
   <Link href={flow==="send"?"/send":"/business"} className="back-link">
    <ArrowLeft size={16} aria-hidden/> Back to {flow==="send"?"Send":"Business"}
   </Link>
  </header>
  <main className="workspace-main" id="main-content">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / {flow==="send"?"Send":"Business"} / Wallet</span>
    <h1>Set up your payment journey.</h1>
    <p>Connect your own Stellar wallet, inspect the live Testnet, and prepare a private-payment request.
     Your wallet stays under your control. Actual confidential transfers and payouts are not enabled yet.</p>
   </div>
   <div className="wallet-product-grid">
    <div className="form-panel">
     <div className="panel-heading"><div><h2>Your wallet</h2>
      <span>Freighter extension · real public-account authorization</span></div><Wallet aria-hidden size={22}/></div>
     <div className="wallet-public-status" role="status">
      <Globe2 aria-hidden size={18}/>
      {status?<span>Stellar Testnet connected · ledger #{status.ledger_sequence.toLocaleString()}</span>:
       statusError?<span>Live network unavailable. Wallet access is independent; transfers remain disabled.</span>:
       <span>Checking current Stellar Testnet…</span>}
      <Button variant="outline" size="sm" onClick={()=>setRevision(n=>n+1)}>Refresh</Button>
     </div>
     <WalletConnect expectedNetworkPassphrase={status?.passphrase}
       backendNetworkVerified={Boolean(status)} onWalletChange={onWalletChange}/>
    </div>
    <div className="form-panel">
     <div className="panel-heading"><div><h2>Prepare a transfer</h2>
      <span>Local planning · nothing is signed or submitted</span></div><LockKeyhole aria-hidden size={22}/></div>
     <label className="field" htmlFor="privacy-mode">What needs to stay private?</label>
     <select id="privacy-mode" value={rail} onChange={e=>{setRail(e.target.value as Rail);setReviewed(false);}}>
      <option value="private-payments">Sender and recipient relationship · Private Payments</option>
      <option value="confidential-token">Amount and balances · Confidential Tokens</option>
     </select>
     <label className="field" htmlFor="recipient">Recipient's Stellar address</label>
     <input id="recipient" className="tx-input" spellCheck={false} autoComplete="off" maxLength={56}
      placeholder="G… classic account or C… contract account" value={recipient}
      onChange={e=>{setRecipient(e.target.value);setReviewed(false);}}/>
     {recipient&&!target?<p className="wallet-error" role="status">
      Enter a checksum-valid Stellar G-address or C-address.</p>:null}
     {target?<p className="state-muted">Recipient: {target==="classic"?"classic Stellar account":"Soroban contract account (public identity only)"}</p>:null}
     <label className="field" htmlFor="amount">Intended amount · asset unspecified</label>
     <input id="amount" className="tx-input" inputMode="decimal" type="text" maxLength={24}
      placeholder="0.00" value={amount}
      onChange={e=>{setAmount(e.target.value);setReviewed(false);}}/>
     <p className="state-muted">Amount and recipient stay in this browser tab. No quote, token or exchange rate is inferred.</p>
     <Button disabled={!canReview} onClick={review} type="button">
      Review privacy readiness <ArrowRight size={16} aria-hidden/>
     </Button>
     {reviewed&&canReview?<div className="wallet-review" role="status">
      <ShieldAlert size={19} aria-hidden/>
      <div><strong>Transfer not yet available</strong>
       <p>{failReason} Payment execution, issuer settlement and payout providers have not been enabled.</p>
       <p>No transfer was initiated. Your details were not sent to StealthBridge.</p>
      </div>
     </div>:null}
    </div>
   </div>
   <section className="form-panel wallet-smart-area" aria-label="Smart account and privacy roadmap">
    <div className="panel-heading"><div>
     <h2>Passkey &amp; smart accounts</h2>
     <span>Programmable authorization for business teams and everyday users</span>
    </div><CheckCircle2 aria-hidden size={22}/></div>
    <p className="state-muted">StealthBridge will use Soroban contract accounts for passkeys, recovery
     and organization policies. No smart-account factory or relayer has been deployed and verified
     for customer use; connecting Freighter does not create a smart account.</p>
    <div className="wallet-passkey-check">
     <Button type="button" variant="outline" disabled={passkeyState==="checking"}
      onClick={()=>void checkPasskeySupport()}>
      {passkeyState==="checking"?"Checking device…":"Check device passkey support"}
     </Button>
     {passkeyState==="available"?<p role="status">This device reports a passkey-capable authenticator.
      Smart-account creation requires a separately verified contract, WebAuthn verifier and account recovery integration.</p>:null}
     {passkeyState==="unavailable"?<p role="status">A platform passkey authenticator is not available or could not be checked. Freighter remains the supported wallet connection.</p>:null}
    </div>
    <label className="field" htmlFor="smart-watch">Already have a Soroban contract-account address?</label>
    <input id="smart-watch" className="tx-input" placeholder="C… public contract account" maxLength={56}
     value={smartAccount} spellCheck={false} autoComplete="off"
     onChange={e=>setSmartAccount(e.target.value)}/>
    {smartAccount?<p className="state-muted" role="status">
     {isContractStrKey(smartAccount)?"Valid contract-address format. Ownership and wallet authorization are not verified.":
      "Enter a valid C-address to inspect its public identifier. A C-address alone is not proof of a smart wallet."}
    </p>:null}
    <p className="wallet-security-note">StealthBridge does not request seed phrases, silently generate
     private keys, store payment instructions, or claim a zero-knowledge proof was created when it was not.</p>
   </section>
  </main>
  <footer className="workspace-footer">
   StealthBridge · Stellar Testnet wallet access · <Link href="/">Home</Link>
  </footer>
 </div>;
}
