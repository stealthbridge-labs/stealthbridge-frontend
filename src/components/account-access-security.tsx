"use client";
import {useEffect,useRef,useState} from "react";
import {Fingerprint,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";
import {KIT_MAX_AGE_SECONDS,loadSmartAccountKit,type SmartAccountKit} from "@/lib/smart-account-kit";

const LABELS={account_code:"Account logic",webauthn_instance:"Passkey verifier",webauthn_code:"Passkey verifier logic",
 threshold_instance:"Approval policy",threshold_code:"Approval policy logic",
 spendingLimit_instance:"Spending policy",spendingLimit_code:"Spending policy logic"};
const STATUS={live:"Healthy",low_ttl:"Needs renewal",unavailable:"Unavailable",mismatch:"Code mismatch"};
export function AccountAccessSecurity({address}:{address:string}){
 const account=canonicalStellarAccountAddress(address);
 const [kit,setKit]=useState<SmartAccountKit|null>(null);
 const [state,setState]=useState<"loading"|"ready"|"error">("loading");
 const [revision,refresh]=useState(0);
 const [device,setDevice]=useState("Not checked on this device");
 const [checking,setChecking]=useState(false);
 const [copied,setCopied]=useState("");
 const alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  const controller=new AbortController();let expiry:ReturnType<typeof setTimeout>|undefined;
  void loadSmartAccountKit(controller.signal).then(value=>{
   if(controller.signal.aborted)return;
   setKit(value);setState("ready");
   expiry=setTimeout(()=>{setKit(null);setState("error");},
    Math.max(0,(value.observed_at_unix+KIT_MAX_AGE_SECONDS+1)*1000-Date.now()));
  }).catch(()=>{if(!controller.signal.aborted){setKit(null);setState("error");}});
  return()=>{controller.abort();clearTimeout(expiry);};
 },[revision]);
 async function checkDevice(){
  setChecking(true);
  try{
   const available=window.isSecureContext&&typeof PublicKeyCredential!=="undefined"&&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable==="function"&&
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
   if(alive.current)setDevice(available?"Device passkey support detected":"Device passkey support not detected");
  }catch{if(alive.current)setDevice("Device availability could not be checked. You can try again.");}
  finally{if(alive.current)setChecking(false);}
 }
 async function copyAddress(){
  if(!account)return;
  try{await navigator.clipboard.writeText(account);if(alive.current)setCopied("Address copied");}
  catch{if(alive.current)setCopied("Couldn't copy. Select the address to copy it manually.");}
 }
 const counts=kit?{
  healthy:kit.entries.filter(entry=>entry.status==="live").length,
  low:kit.entries.filter(entry=>entry.status==="low_ttl").length,
  missing:kit.entries.filter(entry=>entry.status==="unavailable").length,
  errors:kit.entries.filter(entry=>entry.status==="mismatch").length
 }:null;
 return <section className="account-security" aria-labelledby="account-security-title">
  <header className="account-security-heading">
   <ShieldCheck aria-hidden size={28}/>
   <div><h2 id="account-security-title">Wallet security & account access</h2>
    <p>StealthBridge is building confidential cross-border payments for people and businesses. Keep track of your access today and what still needs verification before you can move money.</p></div>
  </header>
  <div className="account-security-row">
   <div><h3>Your wallet sign-in</h3><p>A Freighter wallet signature authenticates your login session. It does not authorize a transfer. Freighter sign-in works today.</p></div>
   <div className="account-security-value">
    <strong>{account?"Signed in with your wallet":"Wallet identity unavailable"}</strong>
    {account?<>
     <span className="account-security-short">{account.slice(0,6)}…{account.slice(-6)}</span>
     <details onToggle={()=>setCopied("")}><summary>View my full wallet address</summary>
      <p>This is your public sign-in address. Share it only when you choose.</p>
      <code>{account}</code>
      <Button type="button" variant="outline" size="sm" onClick={()=>void copyAddress()}>Copy my address</Button>
      <p role="status">{copied}</p>
     </details>
    </>:<p>Sign in again to verify your wallet identity. No account readiness is assumed.</p>}
    <p>You do not need to fund or initialize a Testnet wallet to inspect these settings.</p>
   </div>
  </div>
  <div className="account-security-row">
   <div><h3>Device passkey availability</h3><p>Optional, local check for a built-in authenticator. No passkey is created, enrolled or sent to StealthBridge.</p></div>
   <div className="account-security-value"><strong role="status">{device}</strong>
    <Button type="button" variant="outline" size="sm" disabled={checking} onClick={()=>void checkDevice()}>
     <Fingerprint aria-hidden size={17}/>{checking?"Checking device…":"Check this device"}
    </Button><p>Device support does not prove credential ownership or recovery. Your wallet remains your sign-in method.</p>
   </div>
  </div>
  <div className="account-security-row">
   <div><h3>Your future smart account</h3><p>StealthBridge’s operator manages smart-account deployment. Customers will sign in and use their account when enrollment is available.</p></div>
   <dl className="account-security-gates">
    <div><dt>Customer account enrollment</dt><dd>Not available yet</dd></div>
    <div><dt>Credential recovery</dt><dd>Not verified</dd></div>
    <div><dt>Privacy & ZK proofs</dt><dd>Not verified</dd></div>
    <div><dt>Mainnet</dt><dd>Not yet enabled</dd></div>
    <div><dt>Transfers & financial execution</dt><dd>Not enabled</dd></div>
   </dl>
  </div>
  <div className="account-security-infrastructure">
   <div className="account-security-infrastructure-heading"><div><h3>Supporting infrastructure</h3>
    <p>Public upstream Testnet smart-account kit observations from Stellar RPC. These describe shared infrastructure, not your customer account or a StealthBridge deployment.</p></div>
    <Button type="button" variant="outline" size="sm" disabled={state==="loading"} onClick={()=>{setKit(null);setState("loading");refresh(v=>v+1);}}>
     {state==="loading"?"Checking infrastructure…":state==="error"?"Retry infrastructure check":"Refresh infrastructure"}
    </Button>
   </div>
   {state==="loading"?<p role="status">Checking the seven pinned artifacts…</p>:null}
   {state==="error"?<p role="alert" className="account-security-error">Infrastructure status unavailable. We couldn’t verify a fresh, complete observation. Retry to check again; customer accounts and payments remain unavailable.</p>:null}
   {kit&&counts?<>
    <p role="status" className="account-security-summary">{counts.healthy}/7 healthy · {counts.low} need renewal · {counts.missing} unavailable · {counts.errors} code errors</p>
    <p>Observed <time dateTime={new Date(kit.observed_at_unix*1000).toISOString()}>{new Date(kit.observed_at_unix*1000).toLocaleTimeString()}</time>. Observations expire after 90 seconds.</p>
    <details><summary>View seven infrastructure observations</summary>
     <ul className="account-security-artifacts">{kit.entries.map(entry=><li key={entry.name}>
      <div><strong>{LABELS[entry.name]}</strong><span>{entry.kind==="code"?"Code artifact":"Shared instance"}</span></div>
      <div><strong>{STATUS[entry.status]}</strong><span>{entry.ttl_remaining_ledgers===null?"Lifetime unavailable":`${entry.ttl_remaining_ledgers.toLocaleString()} ledgers remaining`}</span></div>
     </li>)}</ul>
     <p>Pinned kit version {kit.kit_version}. A healthy artifact matches its pinned code and has more than 120,960 ledgers remaining. Renewal and code issues require operator attention.</p>
    </details>
   </>:null}
   <p className="account-security-boundary">Even if every artifact is healthy, customer account creation, recovery and privacy verification remain incomplete. No payment can be executed.</p>
  </div>
 </section>;
}
