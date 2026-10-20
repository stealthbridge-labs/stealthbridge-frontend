"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,ArrowUpRight,Building2,CheckCircle2,Clock3,Globe2,LockKeyhole,RefreshCw,ShieldCheck,Wallet2} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {WalletConnect} from "@/components/wallet-connect";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";
import {isContractStrKey} from "@/lib/observer-activity";
import {preparePrivateTransfer} from "@/lib/private-transfer";
import {activePublicContractAtAddress,validContractObservation,type ContractObservation} from "@/lib/contract-observation";
import {validPublicWalletStatus,type PublicWalletStatus} from "@/lib/public-wallet-status";
import {loadCustomerCorridors,loadVerifiedCustomerCorridor,sameCustomerCorridor,type CustomerCorridor} from "@/lib/customer-corridors";

type Flow="send"|"business";
type FetchState="loading"|"ready"|"error";
const countryNames=new Intl.DisplayNames(["en"],{type:"region"});
const country=(code:string)=>countryNames.of(code)??code;
const amountValid=(value:string)=>/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,7})?$/.test(value)&&Number(value)>0;
function isRecipient(value:string){return !!canonicalStellarAccountAddress(value)||isContractStrKey(value);}
function labelForCorridor(item:CustomerCorridor){
 return country(item.origin_country)+" → "+country(item.destination_country)+" · "+item.asset_code;
}
async function inspectRecipient(address:string):Promise<ContractObservation>{
 const response=await fetch("/api/public/contract/"+address,{method:"GET",cache:"no-store",credentials:"omit",
  signal:AbortSignal.timeout(9500)});
 if(!response.ok)throw new Error("We couldn't confirm this contract on Testnet.");
 const result:unknown=await response.json();
 if(!validContractObservation(result,address))throw new Error("The contract response could not be verified.");
 return result;
}
export function CustomerPaymentWorkspace({flow,identityAddress}:{flow:Flow;identityAddress?:string}){
 const business=flow==="business";
 const [network,setNetwork]=useState<PublicWalletStatus|null>(null);
 const [networkState,setNetworkState]=useState<FetchState>("loading");
 const [networkRevision,setNetworkRevision]=useState(0);
 const [corridors,setCorridors]=useState<CustomerCorridor[]>([]);
 const [corridorState,setCorridorState]=useState<FetchState>("loading");
 const [corridorCursor,setCorridorCursor]=useState<string|null>(null);
 const [moreLoading,setMoreLoading]=useState(false);
 const [moreError,setMoreError]=useState(false);
 const catalogGeneration=useRef(0);
 const [corridorRevision,setCorridorRevision]=useState(0);
 const [corridorId,setCorridorId]=useState("");
 const [connected,setConnected]=useState<string|null>(identityAddress??null);
 const [recipient,setRecipient]=useState("");
 const [amount,setAmount]=useState("");
 const [reference,setReference]=useState("");
 const [recipientEvidence,setRecipientEvidence]=useState<ContractObservation|null>(null);
 const [recipientPending,setRecipientPending]=useState(false);
 const [recipientError,setRecipientError]=useState<string|null>(null);
 const [reviewed,setReviewed]=useState(false);
 const [reviewPending,setReviewPending]=useState(false);
 const [reviewError,setReviewError]=useState<string|null>(null);
 const reviewGeneration=useRef(0);
 const invalidateReview=useCallback(()=>{
  reviewGeneration.current++;
  setReviewPending(false);setReviewError(null);setReviewed(false);
 },[]);
 const recipientRequest=useRef(0);
 const onWalletChange=useCallback((value:string|null)=>{setConnected(value);invalidateReview();},[invalidateReview]);
 useEffect(()=>{
  const ctl=new AbortController();setNetwork(null);setNetworkState("loading");invalidateReview();
  void (async()=>{
   try{
    const response=await fetch("/api/public/status",{method:"GET",cache:"no-store",credentials:"omit",signal:ctl.signal});
    if(!response.ok)throw Error("STATUS_UNAVAILABLE");
    const value:unknown=await response.json();
    if(!validPublicWalletStatus(value))throw Error("INVALID_NETWORK");
    if(!ctl.signal.aborted){setNetwork(value);setNetworkState("ready");}
   }catch{if(!ctl.signal.aborted)setNetworkState("error");}
  })();
  return ()=>ctl.abort();
 },[networkRevision,invalidateReview]);
 useEffect(()=>{
  const ctl=new AbortController();const generation=++catalogGeneration.current;
  setCorridorState("loading");setCorridors([]);setCorridorCursor(null);
  setMoreError(false);setMoreLoading(false);setCorridorId("");invalidateReview();
  void (async()=>{
   try{
    const page=await loadCustomerCorridors(ctl.signal);
    if(!ctl.signal.aborted&&generation===catalogGeneration.current){
     setCorridors(page.items);setCorridorCursor(page.next_cursor);setCorridorState("ready");
    }
   }catch{if(!ctl.signal.aborted&&generation===catalogGeneration.current)setCorridorState("error");}
  })();
  return ()=>ctl.abort();
 },[corridorRevision,invalidateReview]);
 const loadMoreRoutes=async()=>{
  const after=corridorCursor;
  if(!after||moreLoading)return;
  const generation=catalogGeneration.current;
  setMoreLoading(true);setMoreError(false);
  try{
   const page=await loadCustomerCorridors(AbortSignal.timeout(9500),after);
   if(generation!==catalogGeneration.current)return;
   if(page.items.some(item=>corridors.some(existing=>existing.id===item.id)))
    throw Error("Duplicated corridor records.");
   setCorridors(current=>[...current,...page.items]);
   setCorridorCursor(page.next_cursor);
  }catch{if(generation===catalogGeneration.current)setMoreError(true);}
  finally{if(generation===catalogGeneration.current)setMoreLoading(false);}
 };
 const corridor=corridors.find(row=>row.id===corridorId)??null;
 const networkFresh=!!network&&validPublicWalletStatus(network);
 const recipientAddress=recipient.trim();
 const contractRecipient=isContractStrKey(recipientAddress);
 const contractPresent=!contractRecipient||activePublicContractAtAddress(recipientEvidence,recipientAddress);
 const rail=corridor?.privacy_rail??(business?"confidential-token":"private-payments");
 const prepared=preparePrivateTransfer({
  sender:connected,recipient:recipientAddress,amount,rail,backendTestnetFresh:networkFresh
 });
 const formComplete=!!corridor&&!!connected&&isRecipient(recipientAddress)&&amountValid(amount)&&
  prepared.validLocalDraft&&contractPresent&&
  (!business||reference.trim().length>=3);
 const canReview=formComplete&&networkFresh&&corridorState==="ready";
 const recipientKind=canonicalStellarAccountAddress(recipientAddress)?"classic":
  contractRecipient?"contract":"unknown";
 const review=async()=>{
  if(!canReview||!networkFresh||!corridor){invalidateReview();return;}
  const generation=++reviewGeneration.current;
  const selected=corridor;
  setReviewed(false);setReviewError(null);setReviewPending(true);
  try{
   // Fetch new server-side operator configuration and RPC-derived network
   // status; only the public corridor ID goes to StealthBridge's backend.
   // The amount, recipient and business reference remain browser-local.
   const [current,statusResponse]=await Promise.all([
    loadVerifiedCustomerCorridor(selected.id,AbortSignal.timeout(9000)),
    fetch("/api/public/status",{method:"GET",credentials:"omit",cache:"no-store",
     signal:AbortSignal.timeout(9000)})
   ]);
   if(!statusResponse.ok)throw Error("The Testnet network observation is unavailable.");
   const observed:unknown=await statusResponse.json();
   if(!validPublicWalletStatus(observed))
    throw Error("A fresh, valid Testnet observation is required before review.");
   if(!sameCustomerCorridor(selected,current))
    throw Error("This payment route changed. Refresh the corridor directory and review the new details.");
   if(generation!==reviewGeneration.current)return;
   setNetwork(observed);
   setReviewed(true);
  }catch(error){
   if(generation===reviewGeneration.current){
    setReviewError(error instanceof Error?error.message:"Unable to refresh this route.");
   }
  }finally{
   if(generation===reviewGeneration.current)setReviewPending(false);
  }
 };
 const checkRecipient=async()=>{
  if(!contractRecipient)return;
  const address=recipientAddress;
  const request=++recipientRequest.current;
  setRecipientPending(true);setRecipientError(null);setRecipientEvidence(null);invalidateReview();
  try{
   const observation=await inspectRecipient(address);
   if(request===recipientRequest.current)setRecipientEvidence(observation);
  }catch(error){
   if(request===recipientRequest.current)
    setRecipientError(error instanceof Error?error.message:"Contract inspection unavailable.");
  }finally{if(request===recipientRequest.current)setRecipientPending(false);}
 };
 const clearRecipient=(value:string)=>{
  recipientRequest.current++;setRecipient(value);setRecipientEvidence(null);
  setRecipientError(null);setRecipientPending(false);invalidateReview();
 };
 const changeCorridor=(value:string)=>{
  setCorridorId(value);invalidateReview();setAmount("");
  // A corridor is specific to an asset and privacy rail. Old recipient checks
  // are not carried into a new payment intent.
  recipientRequest.current++;setRecipientEvidence(null);setRecipientPending(false);setRecipientError(null);
 };
 const Content=identityAddress?"div":"main";
 return <div className={identityAddress?"payment-product account-payment-view":"workspace-page payment-product"}>
  {!identityAddress?<header className="workspace-header payment-topbar">
   <Brand/>
   <div className="payment-top-actions">
    <span className="network-chip"><i aria-hidden/> Testnet</span>
    <Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden/> Home</Link>
   </div>
  </header>:null}
  <Content className="payment-main" id={identityAddress?undefined:"main-content"}>
   <nav className="payment-nav" aria-label="Product sections">
    <Link href={identityAddress?"/app/send":"/send"} aria-current={!business?"page":undefined}>Personal transfers</Link>
    <Link href={identityAddress?"/app/business":"/business"} aria-current={business?"page":undefined}>Business payments</Link>
    <Link href={identityAddress?"/app":"/platform"}>{identityAddress?"Overview":"Platform"} <ArrowUpRight size={14} aria-hidden/></Link>
   </nav>
   <div className="payment-intro">
    <div>
     <span className="section-index">StealthBridge / {business?"Business":"Send"}</span>
     <h1>{business?"Your business, across borders.":"Send beyond borders."}</h1>
     <p>{business?
      "Manage cross-border payment preparation from one workspace, with clear corridor availability, asset details and wallet access.":
      "Choose where you're sending, add a recipient, and see what is available for your transfer."}</p>
    </div>
    <div className="payment-live">
     <span className="payment-live-dot"><Globe2 size={16} aria-hidden/></span>
     <div>
      <strong>{networkFresh?"Stellar Testnet online":networkState==="loading"?"Checking network":"Live status unavailable"}</strong>
      <small>{networkFresh?"Ledger "+network.ledger_sequence.toLocaleString():"Transfers are not enabled"}</small>
     </div>
     <button type="button" onClick={()=>{invalidateReview();setNetworkRevision(n=>n+1);}} aria-label="Refresh network status"><RefreshCw size={16} aria-hidden/></button>
    </div>
   </div>
   <div className="payment-layout">
    <div className="payment-stack">
     <section className="payment-card" aria-labelledby="new-payment-heading">
      <div className="payment-card-heading">
       <div><span className="payment-eyebrow">{business?"Business settlement":"International transfer"}</span>
        <h2 id="new-payment-heading">{business?"New business payment":"New transfer"}</h2></div>
       {business?<Building2 size={24} aria-hidden/>:<ArrowUpRight size={24} aria-hidden/>}
      </div>
      <div className="payment-step"><span>01</span><strong>Where is the money going?</strong></div>
      <label className="payment-label" htmlFor="payment-corridor">Payment route</label>
      <select className="payment-input" id="payment-corridor" value={corridorId}
       onChange={event=>changeCorridor(event.target.value)} disabled={corridorState!=="ready"||corridors.length===0}>
       <option value="">{corridorState==="loading"?"Loading available routes…":
        corridorState==="error"?"Routes currently unavailable":
        "Choose an available route"}</option>
       {corridors.map(item=><option key={item.id} value={item.id}>{labelForCorridor(item)}</option>)}
      </select>
      {corridorState==="ready"&&corridors.length===0?<div className="payment-empty" role="status">
       <Clock3 size={18} aria-hidden/><div><strong>No payment corridors are available yet.</strong>
        <p>Only verified operator-configured routes appear here. You can connect your wallet, but funds cannot be sent through StealthBridge yet.</p></div>
      </div>:null}
      {corridorState==="error"?<div className="payment-empty" role="alert"><Clock3 size={18} aria-hidden/>
       <div><strong>We couldn't load payment routes.</strong><p>Please retry. No destinations or prices have been guessed.</p>
       <Button size="sm" variant="outline" onClick={()=>setCorridorRevision(n=>n+1)}>Retry</Button></div>
      </div>:null}
      {corridorCursor?<div className="payment-load-more">
       <Button type="button" variant="outline" size="sm" disabled={moreLoading}
        onClick={()=>void loadMoreRoutes()}>{moreLoading?"Loading routes…":"Load more routes"}</Button>
       {moreError?<span role="alert">More routes could not be loaded. Retry to continue.</span>:null}
      </div>:null}
      {corridor?<div className="payment-route-summary" role="status">
       <div><span>From</span><strong>{country(corridor.origin_country)}</strong></div>
       <ArrowRight size={17} aria-hidden/>
       <div><span>To</span><strong>{country(corridor.destination_country)}</strong></div>
       <div><span>Declared asset</span><strong>{corridor.asset_code}</strong></div>
      </div>:null}
      {corridor?<div className="payment-privacy-info"><ShieldCheck size={18} aria-hidden/>
       <div><strong>{corridor.privacy_rail==="confidential-token"?"Amount confidentiality":"Sender-recipient relationship privacy"}</strong>
        <p>This route declares a privacy mode. Its verifier, asset issuer and live payment integration are not yet approved; confidentiality is not currently available.</p>
       </div>
      </div>:null}
      <div className="payment-step"><span>02</span><strong>{business?"Who are you paying?":"Who will receive it?"}</strong></div>
      <label className="payment-label" htmlFor="payment-recipient">Recipient Stellar wallet address</label>
      <input className="payment-input" id="payment-recipient" value={recipient} autoComplete="off" spellCheck={false}
       placeholder="G… or C… address" maxLength={56} onChange={event=>clearRecipient(event.target.value)}/>
      {recipient&&recipientKind==="unknown"?<p className="payment-field-error" role="status">Enter a valid Stellar account or contract address.</p>:null}
      {contractRecipient?<div className="payment-contract-check">
       <Button type="button" size="sm" variant="outline" disabled={recipientPending} onClick={()=>void checkRecipient()}>
        {recipientPending?"Checking contract…":"Check recipient contract"}
       </Button>
       {recipientEvidence?<span role="status">{contractPresent?
        "Active contract observed. Asset acceptance and ownership are not verified.":
        "No active contract found. This address cannot proceed."}</span>:null}
       {recipientError?<span role="alert">{recipientError}</span>:null}
      </div>:null}
      <div className="payment-step"><span>03</span><strong>{business?"Payment details":"Amount to send"}</strong></div>
      <div className="payment-input-grid">
       <div><label className="payment-label" htmlFor="payment-amount">Amount</label>
        <input className="payment-input" id="payment-amount" inputMode="decimal" value={amount}
         placeholder="0.00" maxLength={24} onChange={event=>{setAmount(event.target.value);invalidateReview();}}/>
       </div>
       <div><label className="payment-label" htmlFor="payment-asset">Asset</label>
        <input className="payment-input" id="payment-asset" readOnly value={corridor?.asset_code??"Not selected"}
         aria-describedby="asset-detail"/>
       </div>
      </div>
      <p id="asset-detail" className="payment-hint">Assets come from live corridor configuration, not a simulated quote. Exchange rates and provider fees are not available.</p>
      {business?<><label className="payment-label" htmlFor="payment-reference">Internal payment reference</label>
       <input className="payment-input" id="payment-reference" autoComplete="off" maxLength={64}
        value={reference} onChange={event=>{setReference(event.target.value);invalidateReview();}}
        placeholder="Your invoice or purchase-order reference"/>
       <p className="payment-hint">Reference is kept in this browser tab; no invoice or approval request is submitted.</p>
      </>:null}
      <div className="payment-action-row">
       <Button type="button" variant="primary" disabled={!canReview||reviewPending}
        onClick={()=>void review()}>
        {reviewPending?"Rechecking route and network…":"Review payment details"} <ArrowRight size={16} aria-hidden/>
       </Button>
       <span><LockKeyhole size={14} aria-hidden/> No funds will move</span>
      </div>
      {reviewError?<p role="alert" className="payment-field-error">{reviewError}</p>:null}
      {reviewed&&canReview&&!reviewPending?<div className="payment-review" role="status">
       <CheckCircle2 size={20} aria-hidden/><div><strong>Current route and Testnet observation rechecked · payment not submitted</strong>
        <p>{amount} {corridor!.asset_code} · {labelForCorridor(corridor!)}. {business?"Your reference is included in this browser-only review. ":""}
         This corridor record does not confirm liquidity, issuer support, fees, privacy proofs or payout readiness.</p>
        <p>Transfer execution is not yet available. Nothing has been signed, charged or stored.</p>
       </div>
      </div>:null}
     </section>
     {business?<section className="payment-card payment-business-info">
      <div className="payment-card-heading"><div><span className="payment-eyebrow">Operations</span>
       <h2>Business payment controls</h2></div><ShieldCheck size={22} aria-hidden/></div>
      <div className="payment-feature-list">
       <div><strong>Team approvals</strong><span>Requires verified organization sessions and signer policies before use</span></div>
       <div><strong>Settlement tracking</strong><span>Awaiting independently reconciled payment and payout records</span></div>
       <div><strong>Confidential amounts</strong><span>Requires verified token issuers and zero-knowledge proof integration</span></div>
      </div>
      <Link href="/platform" className="payment-inline-link">Explore business infrastructure <ArrowUpRight size={15} aria-hidden/></Link>
     </section>:null}
    </div>
    <aside className="payment-stack" aria-label="Payment account and summary">
     <section className="payment-card payment-account-card">
      <div className="payment-card-heading"><div><span className="payment-eyebrow">Account</span>
       <h2>Your wallet</h2></div><Wallet2 size={23} aria-hidden/></div>
      {identityAddress?<div className="account-payment-identity">
       <div><CheckCircle2 size={19} aria-hidden/><strong>Signed in securely</strong></div>
       <p>Your Stellar account identity was verified using a signed challenge.</p>
       <code title={identityAddress}>{identityAddress}</code>
       <p className="payment-hint">Your wallet signature gives account access only. This session cannot authorize a transfer or business approval.</p>
       <Link href="/app" className="payment-inline-link">Account overview <ArrowUpRight size={14} aria-hidden/></Link>
      </div>:<WalletConnect compact expectedNetworkPassphrase={network?.passphrase}
       backendNetworkVerified={networkFresh} onWalletChange={onWalletChange}/>}
     </section>
     <section className="payment-card payment-summary-card">
      <div className="payment-card-heading"><div><span className="payment-eyebrow">Overview</span>
       <h2>{business?"Settlement summary":"Transfer summary"}</h2></div><ShieldCheck size={22} aria-hidden/></div>
      <dl>
       <div><dt>Destination</dt><dd>{corridor?country(corridor.destination_country):"Not selected"}</dd></div>
       <div><dt>Send amount</dt><dd>{amountValid(amount)&&corridor?amount+" "+corridor.asset_code:"—"}</dd></div>
       <div><dt>Recipient</dt><dd>{isRecipient(recipientAddress)?recipientAddress.slice(0,8)+"…"+recipientAddress.slice(-6):"Not entered"}</dd></div>
       <div><dt>Privacy option</dt><dd>{corridor?(corridor.privacy_rail==="confidential-token"?"Amount privacy · pending":"Relationship privacy · pending"):"Not selected"}</dd></div>
       <div><dt>FX rate</dt><dd>Unavailable</dd></div>
       <div><dt>Platform & provider fees</dt><dd>Not quoted</dd></div>
       <div><dt>Recipient receives</dt><dd>Not quoted</dd></div>
      </dl>
      <div className="payment-summary-status"><Clock3 size={16} aria-hidden/>
       <span>Payment services not yet open on this route</span></div>
      <button type="button" className="payment-disabled-action" disabled aria-disabled="true">
       {business?"Submit settlement":"Confirm and send"} <LockKeyhole size={16} aria-hidden/>
      </button>
      <p className="payment-hint">StealthBridge does not request a signature or debit a wallet until the transfer rail, fees, and required approvals are independently verified.</p>
     </section>
    </aside>
   </div>
   <footer className="payment-footer">
    <span>Stellar Testnet · Real wallet and corridor reads · Payments disabled</span>
    <Link href={identityAddress?"/app":"/login"}>{identityAddress?"Account overview":"Sign in"} <ArrowUpRight size={14} aria-hidden/></Link>
   </footer>
  </Content>
 </div>;
}
