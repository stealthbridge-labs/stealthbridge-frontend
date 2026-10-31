"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Building2,Clock3,LockKeyhole,RefreshCw,UsersRound} from "lucide-react";
import {getAccountDirectory,type AccountDirectory} from "@/lib/account-directory";
import {loadBusinessOnboarding,type BusinessOnboardingEnvelope} from "@/lib/business-onboarding";
import {Button} from "@/components/ui/button";

type State={status:"loading"|"ready"|"unavailable";pending:BusinessOnboardingEnvelope|null;
 directory:AccountDirectory|null};
const empty:State={status:"loading",pending:null,directory:null};

/**
 * Account-bound, verified Neon views only. It is a management summary,
 * never a progress-to-compliance meter or permission to accept payments.
 */
export function BusinessOverview({address}:{address:string}){
 const [revision,refresh]=useState(0);
 const [state,setState]=useState<State>(empty);
 useEffect(()=>{
  const controller=new AbortController();
  setState(empty);
  void Promise.allSettled([
   loadBusinessOnboarding(address,controller.signal),
   getAccountDirectory(address,controller.signal)
  ]).then(([pending,directory])=>{
   if(controller.signal.aborted)return;
   const a=pending.status==="fulfilled"?pending.value:null;
   const b=directory.status==="fulfilled"?directory.value:null;
   setState({status:a&&b?"ready":"unavailable",pending:a,directory:b});
  });
  return ()=>controller.abort();
 },[address,revision]);
 const pending=state.pending;
 const directory=state.directory;
 return <section className="business-readiness" aria-labelledby="business-readiness-title">
  <div className="business-readiness-header">
   <div><span className="section-index">YOUR BUSINESS / AT A GLANCE</span>
    <h2 id="business-readiness-title">Pick up where you left off.</h2>
    <p>Your business details are read from your account, never a fabricated payment history.</p>
   </div>
   <Button type="button" variant="outline" size="sm" onClick={()=>refresh(n=>n+1)}
    disabled={state.status==="loading"}><RefreshCw size={15} aria-hidden/> Refresh</Button>
  </div>
  {state.status==="loading"?<p role="status" className="business-readiness-notice">Checking your saved business records…</p>:null}
  {state.status==="unavailable"?<div role="alert" className="business-readiness-notice">
   <strong>Some business information could not be verified.</strong>
   <p>We will not guess what you have registered or what access you hold. Try refreshing your records.</p>
  </div>:null}
  {state.status==="ready"&&pending&&directory?<div className="business-readiness-grid">
   <Link href="#business-onboarding" className="business-readiness-item">
    <span className="business-readiness-icon"><Clock3 size={18} aria-hidden/></span>
    <span><small>Applications</small><strong>{pending.applications.length===0&& !pending.has_more?
     "No pending applications":pending.has_more?
     "Pending applications available":pending.applications.length===1?"1 pending application":
     pending.applications.length+" pending applications"}</strong>
     <em>{pending.applications.length||pending.has_more?"Manage applications":"Register a business"}</em></span>
    <ArrowRight size={16} aria-hidden/>
   </Link>
   <Link href="#business-organizations" className="business-readiness-item">
    <span className="business-readiness-icon"><UsersRound size={18} aria-hidden/></span>
    <span><small>Organization access</small><strong>{directory.organizations.length===0&&!directory.has_more?
     "No linked organizations":directory.has_more?
     "Organization memberships available":directory.organizations.length===1?
     "1 current membership":directory.organizations.length+" current memberships"}</strong>
     <em>Review people and access</em></span>
    <ArrowRight size={16} aria-hidden/>
   </Link>
   <Link href="/app/business/payments" className="business-readiness-item">
    <span className="business-readiness-icon"><Building2 size={18} aria-hidden/></span>
    <span><small>Payment preparation</small><strong>Plan without funding</strong>
     <em>Review a payment route</em></span><ArrowRight size={16} aria-hidden/>
   </Link>
   <div className="business-readiness-item business-readiness-blocked">
    <span className="business-readiness-icon"><LockKeyhole size={18} aria-hidden/></span>
    <span><small>Money movement</small><strong>Transfers not available</strong>
     <em>Privacy, settlement and payout controls still require verification</em></span>
   </div>
  </div>:null}
  <p className="business-readiness-fineprint">A saved application is not company verification. Membership is not payment authority. There is no transfer balance, quote or settlement status here.</p>
 </section>;
}
