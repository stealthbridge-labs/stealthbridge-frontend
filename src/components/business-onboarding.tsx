"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Building2,CheckCircle2,Clock3,RefreshCw,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {loadBusinessOnboarding,registerBusinessOnboarding,
 validBusinessApplicationName,type BusinessOnboardingEnvelope} from "@/lib/business-onboarding";
type ReadState="loading"|"ready"|"unavailable";
export function BusinessOnboarding({address}:{address:string}){
 const [status,setStatus]=useState<ReadState>("loading");
 const [data,setData]=useState<BusinessOnboardingEnvelope|null>(null);
 const [revision,setRevision]=useState(0);
 const [name,setName]=useState("");
 const [saving,setSaving]=useState(false);
 const [formError,setFormError]=useState("");
 const [confirmation,setConfirmation]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  setStatus("loading");setData(null);
  void loadBusinessOnboarding(address,controller.signal)
   .then(result=>{
    if(!controller.signal.aborted){setData(result);setStatus("ready");}
   })
   .catch(()=>{if(!controller.signal.aborted)setStatus("unavailable");});
  return ()=>controller.abort();
 },[address,revision]);
 async function submit(event:React.FormEvent){
  event.preventDefault();
  if(status!=="ready"||saving||!validBusinessApplicationName(name)||!data||
    data.applications.length>=3)return;
  setSaving(true);setFormError("");setConfirmation("");
  try{
   const result=await registerBusinessOnboarding(address,name);
   setConfirmation(result.applications[0]?.display_name??"");
   setName("");
   // Fresh DB read: do not invent organization records from a successful
   // POST alone or treat a pending record as compliance verification.
   setRevision(current=>current+1);
  }catch(error){
   setFormError(error instanceof Error?error.message:"Unable to register this application.");
  }finally{setSaving(false);}
 }
 return <section className="business-onboarding" aria-labelledby="business-onboarding-title">
  <div className="business-onboarding-head">
   <div><span className="section-index">YOUR BUSINESS / GETTING STARTED</span>
    <h2 id="business-onboarding-title">Build your business space.</h2>
    <p>Register your organization details so you can return to them as we prepare business onboarding, team controls and supported payment corridors.</p>
   </div>
   <span className="business-onboarding-symbol"><Building2 size={30} aria-hidden/></span>
  </div>
  <div className="business-onboarding-body">
   <div className="business-onboarding-form-wrap">
    <div className="business-onboarding-step"><span>01</span><strong>Tell us about your business</strong></div>
    <p>Start with a name for your business workspace. This is an application—not legal-entity verification or approval to process funds.</p>
    {status==="loading"?<p role="status" className="business-onboarding-notice">Looking up your saved business applications…</p>:null}
    {status==="unavailable"?<div role="alert" className="business-onboarding-notice">
     <strong>Business onboarding is temporarily unavailable.</strong>
     <p>We haven't created or changed an organization. Check the connection and retry.</p>
     <Button type="button" variant="outline" size="sm" onClick={()=>setRevision(v=>v+1)}>
      <RefreshCw size={15} aria-hidden/> Retry</Button>
    </div>:null}
    {status==="ready"?<form onSubmit={event=>void submit(event)} className="business-onboarding-form">
     <label htmlFor="business-workspace-name">Business or organization name</label>
     <input id="business-workspace-name" name="businessName" autoComplete="organization"
      placeholder="The business name you want to register"
      maxLength={120} required value={name}
      onChange={event=>{setName(event.target.value);setFormError("");setConfirmation("");}}/>
     <p>You'll be listed as the person who initiated this application. No verification status is granted.</p>
     <Button type="submit" disabled={saving||!validBusinessApplicationName(name)||
       Boolean(data?.has_more)||Boolean(data&&data.applications.length>=3)}>
      {saving?"Registering…":"Register business application"} <ArrowRight size={16} aria-hidden/>
     </Button>
     {data?.applications.length===3||data?.has_more?
      <p className="business-onboarding-warning">You have reached the pending-application limit for this account.</p>:null}
     {formError?<p role="alert" className="business-onboarding-error">{formError}</p>:null}
     {confirmation?<p role="status" className="business-onboarding-confirmation">
      <CheckCircle2 size={16} aria-hidden/> Application submitted for {confirmation}. Refreshing your applications.
     </p>:null}
    </form>:null}
   </div>
   <div className="business-onboarding-list" aria-labelledby="my-business-applications">
    <div className="business-onboarding-step"><span>02</span><strong id="my-business-applications">Your applications</strong></div>
    {status==="ready"&&data?.applications.length===0?
     <div className="business-onboarding-empty"><Building2 size={26} aria-hidden/>
      <p>You haven't registered a business workspace yet. When you do, its actual pending status will appear here.</p>
     </div>:null}
    {status==="ready"&&data&&data.applications.length>0?<div className="business-onboarding-cards">
     {data.applications.map(application=><article key={application.id} className="business-onboarding-card">
      <span className="business-onboarding-status"><Clock3 size={14} aria-hidden/> Pending onboarding</span>
      <h3>{application.display_name}</h3>
      <p>Application reference: <code>{application.id}</code></p>
      <p>Your recorded role: {application.role} (pending business only)</p>
      <Link className="team-open-link" href={"/app/business/"+application.id}>
       Review application and team <ArrowRight size={16} aria-hidden/>
      </Link>
     </article>)}
     {data.has_more?<p>Additional applications are not included in this first page.</p>:null}
    </div>:null}
    {status!=="ready"?<p className="business-onboarding-muted">Your real business records will appear once available.</p>:null}
   </div>
  </div>
  <div className="business-onboarding-disclosure"><ShieldCheck size={19} aria-hidden/>
   <p>Applications are stored in the existing StealthBridge organization database. They do not establish legal identity, pass compliance checks, enable private settlement, create bank accounts or authorize platform-fee collection. A verified operator-led activation process will be required.</p>
  </div>
 </section>;
}
