"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,Globe2,LockKeyhole,ShieldAlert,Wallet} from "lucide-react";
import {Brand} from "@/components/brand";
import {WalletConnect} from "@/components/wallet-connect";
import {Button} from "@/components/ui/button";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";
import {isContractStrKey} from "@/lib/observer-activity";
import {validPublicWalletStatus,type PublicWalletStatus} from "@/lib/public-wallet-status";
import {preparePrivateTransfer} from "@/lib/private-transfer";
import {validContractObservation,activePublicContractAtAddress,type ContractObservation} from "@/lib/contract-observation";

type Rail="confidential-token"|"private-payments";
type Flow="send"|"business";
function addressType(input:string):"classic"|"contract"|null{
 const trimmed=input.trim();
 return canonicalStellarAccountAddress(trimmed)?"classic":
  isContractStrKey(trimmed)?"contract":null;
}
/** The browser reads only the public C-address requested by a visitor. No payment
 * intent, sender, amount or connected-wallet details leave this workspace.
 */
async function readContractEvidence(address:string):Promise<ContractObservation>{
 const response=await fetch("/api/public/contract/"+address,{method:"GET",cache:"no-store",
  signal:AbortSignal.timeout(9500)});
 if(!response.ok)throw Error("Testnet contract check is unavailable.");
 const value:unknown=await response.json();
 if(!validContractObservation(value,address))throw Error("Received unverified contract evidence.");
 return value;
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
 const [contractEvidence,setContractEvidence]=useState<ContractObservation|null>(null);
 const [recipientEvidence,setRecipientEvidence]=useState<ContractObservation|null>(null);
 const [recipientPending,setRecipientPending]=useState(false);
 const [recipientError,setRecipientError]=useState<string|null>(null);
 const recipientGeneration=useRef(0);
 const [contractPending,setContractPending]=useState(false);
 const [contractError,setContractError]=useState<string|null>(null);
 const contractGeneration=useRef(0);
 const inspectContract=async()=>{
  const address=smartAccount;
  if(!isContractStrKey(address))return;
  const request=++contractGeneration.current;
  setContractPending(true);setContractError(null);setContractEvidence(null);
  try{
   const value=await readContractEvidence(address);
   if(request===contractGeneration.current)setContractEvidence(value);
  }catch(error){
   if(request===contractGeneration.current)
    setContractError(error instanceof Error?error.message:"Testnet contract check failed.");
  }finally{if(request===contractGeneration.current)setContractPending(false);}
 };
 const inspectRecipientContract=async()=>{
  const address=recipient.trim();
  if(!isContractStrKey(address))return;
  const request=++recipientGeneration.current;
  setRecipientPending(true);setRecipientError(null);setRecipientEvidence(null);setReviewed(false);
  try{
   const value=await readContractEvidence(address);
   if(request===recipientGeneration.current)setRecipientEvidence(value);
  }catch(error){
   if(request===recipientGeneration.current)
    setRecipientError(error instanceof Error?error.message:"Testnet contract check failed.");
  }finally{if(request===recipientGeneration.current)setRecipientPending(false);}
 };
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
 const recipientContractActive=target!=="contract" ||
  activePublicContractAtAddress(recipientEvidence,recipient.trim());
 const canReview=preflight.validLocalDraft&&recipientContractActive;
 const review=()=>setReviewed(true);
 const failReason=rail==="private-payments"?
  "Stellar Private Payments proof integration, pool policy and withdrawal safety are not verified.":
  "Confidential Token verifier, issuer permissions and asset deployment are not verified.";
 return <div className="workspace-page">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden/> Stellar Testnet</span>
   <Link href="/" className="back-link">
    <ArrowLeft size={16} aria-hidden/> Home
   </Link>
  </header>
  <main className="workspace-main" id="main-content">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / {flow==="send"?"Send":"Business"} / Wallet</span>
    <h1>{flow==="send"?"Send with StealthBridge.":"StealthBridge Business workspace."}</h1>
    <p>{flow==="send"?
      "Connect your Stellar wallet, verify a real Testnet account and prepare your private international transfer. Payments and payouts are not enabled yet.":
      "Connect your own wallet, verify live Testnet status and prepare confidential business settlement details. Financial settlement and approvals are not enabled yet."}</p>
    <nav aria-label="Payment workspace navigation" className="wallet-workspace-links">
     <Link href="/send" aria-current={flow==="send"?"page":undefined}>Send</Link>
     <Link href="/business" aria-current={flow==="business"?"page":undefined}>Business</Link>
     <Link href={flow==="send"?"/discover/send":"/discover/business"}>How it works <ArrowRight size={15} aria-hidden/></Link>
    </nav>
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
      onChange={e=>{recipientGeneration.current++;setRecipient(e.target.value);setReviewed(false);
       setRecipientEvidence(null);setRecipientPending(false);setRecipientError(null);}}/>
     {recipient&&!target?<p className="wallet-error" role="status">
      Enter a checksum-valid Stellar G-address or C-address.</p>:null}
     {target?<p className="state-muted">Recipient: {target==="classic"?"classic Stellar account":"Soroban contract account (public identity only)"}</p>:null}
     {target==="contract"?<div className="wallet-passkey-check">
      <Button type="button" variant="outline" disabled={recipientPending}
       onClick={()=>void inspectRecipientContract()}>
       {recipientPending?"Checking recipient…":"Inspect recipient contract on Testnet"}
      </Button>
      {recipientError?<p role="alert">{recipientError} Recipient presence is unverified.</p>:null}
      {recipientEvidence?<p role="status">{recipientContractActive?
       "Active public contract instance confirmed on Testnet. This is not proof of recipient control or payment support.":
       "No active public contract instance was found at this address. Draft review is blocked."}
       {" "}Observed ledger #{recipientEvidence.observed_ledger_sequence.toLocaleString()}.</p>:
       <p className="state-muted">Inspect this C-address before local draft review.
        A valid contract address alone does not prove a deployed or capable recipient.</p>}
     </div>:null}
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
   <section className="form-panel wallet-smart-area" aria-label="Passkey and smart account connection">
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
     onChange={e=>{contractGeneration.current++;setSmartAccount(e.target.value);setContractEvidence(null);setContractError(null);setContractPending(false);}}/>
    {smartAccount?<p className="state-muted" role="status">
     {isContractStrKey(smartAccount)?"Valid contract-address format. Ownership and wallet authorization are not verified.":
      "Enter a valid C-address to inspect its public identifier. A C-address alone is not proof of a smart wallet."}
    </p>:null}
    <div className="wallet-passkey-check">
     <Button type="button" variant="outline" disabled={!isContractStrKey(smartAccount)||contractPending}
      onClick={()=>void inspectContract()}>{contractPending?"Checking Testnet…":"Inspect contract on Testnet"}</Button>
     {contractError?<p role="alert">{contractError} No contract ownership was inferred.</p>:null}
     {contractEvidence?<p role="status">{contractEvidence.contract_instance_found?
       "An active Soroban contract instance was found on Stellar Testnet.":
       "No active Soroban contract instance was found at this address."}
       {" "}Ledger #{contractEvidence.observed_ledger_sequence.toLocaleString()}.
       This does not verify a smart wallet, account ownership, signer permissions, passkey recovery or private transfer capability.</p>:null}
    </div>
    <p className="wallet-security-note">StealthBridge does not request seed phrases, silently generate
     private keys, store payment instructions, or claim a zero-knowledge proof was created when it was not.</p>
   </section>
  </main>
  <footer className="workspace-footer">
   StealthBridge · Stellar Testnet wallet access · <Link href="/">Home</Link>
  </footer>
 </div>;
}
