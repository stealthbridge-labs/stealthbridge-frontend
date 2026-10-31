"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Building2,CheckCircle2,LockKeyhole,RefreshCw,Send,UserRound} from "lucide-react";
import {loadCustomerProfile,type CustomerProfile} from "@/lib/account-profile";
import {countryName} from "@/lib/customer-countries";
import {Button} from "@/components/ui/button";

export function AccountJourney({address}:{address:string}){
 const [status,setStatus]=useState<"loading"|"ready"|"unavailable">("loading");
 const [profile,setProfile]=useState<CustomerProfile|null>(null);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  const ctl=new AbortController();
  setStatus("loading");setProfile(null);
  void loadCustomerProfile(address,ctl.signal).then(result=>{
   if(!ctl.signal.aborted){setProfile(result.profile);setStatus("ready");}
  }).catch(()=>{if(!ctl.signal.aborted)setStatus("unavailable");});
  return ()=>ctl.abort();
 },[address,retry]);
 const personal=profile?.use_case!=="business";
 const business=profile?.use_case==="business"||profile?.use_case==="both";
 const firstName=profile?.display_name.trim().split(/\s+/)[0]??null;
 return <section className="account-journey" aria-labelledby="account-journey-title">
  <div className="account-journey-head">
   <div><span className="section-index">YOUR STEALTHBRIDGE ACCOUNT</span>
    <h2 id="account-journey-title">{firstName?"Good to see you, "+firstName+".":"A simpler way to get started."}</h2>
    <p>{profile?
     "Your preferences are saved. Pick up where you want to go next.":
     "Set up your preferences once, then find the tools that matter to you."}</p>
   </div>
   <span className="account-journey-mark"><UserRound size={28} aria-hidden/></span>
  </div>
  {status==="loading"?<p className="account-journey-hint" role="status">Checking your saved preferences…</p>:null}
  {status==="unavailable"?<div className="account-journey-alert" role="alert">
   <p>We couldn't load your saved preferences. Your money and account access are unaffected.</p>
   <Button type="button" variant="outline" size="sm" onClick={()=>setRetry(x=>x+1)}>
    <RefreshCw size={14} aria-hidden/> Try again
   </Button>
  </div>:null}
  {status==="ready"&&!profile?<div className="account-journey-start">
   <span><UserRound size={20} aria-hidden/></span>
   <div><strong>Personalize your account</strong><p>Choose a name, country and why you're here. It does not require payment details.</p></div>
   <Link href="/app/settings">Set up account <ArrowRight size={16} aria-hidden/></Link>
  </div>:null}
  {status==="ready"&&profile?<div className="account-journey-summary">
   <span><CheckCircle2 size={16} aria-hidden/> Preferences saved</span>
   <span>{profile.residence_country?"Based in "+countryName(profile.residence_country):"No country selected"}</span>
   <Link href="/app/settings">Edit preferences <ArrowRight size={15} aria-hidden/></Link>
  </div>:null}
  <div className="account-journey-actions">
   {(personal||!profile)&&<Link href="/app/send" className="account-journey-action">
    <Send size={20} aria-hidden/><span><strong>Prepare a personal transfer</strong><small>Explore a real route and review a recipient</small></span><ArrowRight size={17} aria-hidden/>
   </Link>}
   {(business||!profile)&&<Link href="/app/business" className="account-journey-action">
    <Building2 size={20} aria-hidden/><span><strong>Manage business payments</strong><small>Start onboarding, plan a payment or review a batch</small></span><ArrowRight size={17} aria-hidden/>
   </Link>}
  </div>
  <p className="account-journey-disclaimer"><LockKeyhole size={14} aria-hidden/>
   Your profile is not identity verification. Payment execution and payouts are not available yet.
  </p>
 </section>;
}
