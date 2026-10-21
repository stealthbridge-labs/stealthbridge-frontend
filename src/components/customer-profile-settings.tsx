"use client";
import {useCallback,useEffect,useState} from "react";
import {CheckCircle2,LockKeyhole,RefreshCw,ShieldCheck,UserRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {loadCustomerProfile,saveCustomerProfile,type ProfileInput,
 validProfileInput} from "@/lib/account-profile";
const EMPTY:ProfileInput={display_name:"",use_case:"personal",residence_country:null};
export function CustomerProfileSettings({address}:{address:string}){
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 const [profile,setProfile]=useState<ProfileInput>({...EMPTY});
 const [saved,setSaved]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [revision,reload]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setStatus("loading");setError("");setSaved(false);
  void loadCustomerProfile(address,controller.signal)
   .then(value=>{
    if(controller.signal.aborted)return;
    setProfile(value.profile?{
     display_name:value.profile.display_name,
     use_case:value.profile.use_case,
     residence_country:value.profile.residence_country
    }:{...EMPTY});
    setSaved(value.profile!==null);
    setStatus("ready");
   })
   .catch(()=>{if(!controller.signal.aborted)setStatus("error");});
  return ()=>controller.abort();
 },[address,revision]);
 const update=useCallback((changes:Partial<ProfileInput>)=>{
  setProfile(current=>({...current,...changes}));setError("");setSaved(false);
 },[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();
  if(saving||status!=="ready"||!validProfileInput(profile))return;
  setSaving(true);setError("");
  try{
   const result=await saveCustomerProfile(address,profile);
   if(!result.profile)throw Error("The backend didn't confirm the saved profile.");
   setProfile({display_name:result.profile.display_name,
    use_case:result.profile.use_case,
    residence_country:result.profile.residence_country});
   setSaved(true);
  }catch(e){setError(e instanceof Error?e.message:"Couldn't save profile.");}
  finally{setSaving(false);}
 }
 return <section className="customer-profile-panel" aria-labelledby="customer-profile-title">
  <div className="customer-profile-heading">
   <span className="customer-profile-symbol"><UserRound size={24} aria-hidden/></span>
   <div><span className="section-index">YOUR ACCOUNT</span><h2 id="customer-profile-title">Make this space your own.</h2>
    <p>Choose a display name and the kinds of cross-border services you're exploring. These are personal preferences, not identity verification or financial onboarding.</p>
   </div>
  </div>
  {status==="loading"?<p role="status" className="customer-profile-state">Loading your saved preferences…</p>:null}
  {status==="error"?<div className="customer-profile-state" role="alert">
   <strong>Account preferences aren't available yet.</strong>
   <p>No profile was created or changed. Database setup may still be in progress.</p>
   <Button variant="outline" size="sm" type="button" onClick={()=>reload(v=>v+1)}>
    <RefreshCw size={15} aria-hidden/> Try again
   </Button>
  </div>:null}
  {status==="ready"?<form onSubmit={event=>void submit(event)} className="customer-profile-form">
   <div className="customer-profile-field"><label htmlFor="profile-display">Display name</label>
    <input id="profile-display" value={profile.display_name} required maxLength={80}
      autoComplete="nickname" placeholder="How should we address you?"
      onChange={e=>update({display_name:e.target.value})}/>
    <p>Shown only in your signed-in account. This isn't your legal or verified name.</p>
   </div>
   <div className="customer-profile-field"><label htmlFor="profile-use-case">What brings you to StealthBridge?</label>
    <select id="profile-use-case" value={profile.use_case}
      onChange={e=>update({use_case:e.target.value as ProfileInput["use_case"]})}>
      <option value="personal">Personal international transfers</option>
      <option value="business">Business cross-border settlement</option>
      <option value="both">Both personal and business</option>
    </select>
    <p>Exploring a business use case doesn't automatically create or verify an organization.</p>
   </div>
   <div className="customer-profile-field"><label htmlFor="profile-country">Country of residence (optional)</label>
    <input id="profile-country" maxLength={2} placeholder="e.g. NG" inputMode="text"
      autoComplete="off" value={profile.residence_country??""}
      onChange={e=>update({residence_country:e.target.value?
       e.target.value.toUpperCase():null})}/>
    <p>Two-letter country code. Self-reported, and never used as proof of residence.</p>
   </div>
   <div className="customer-profile-actions">
    <Button type="submit" disabled={saving||!validProfileInput(profile)}>
     {saving?"Saving securely…":"Save my preferences"}
    </Button>
    {saved?<span role="status" className="customer-profile-saved"><CheckCircle2 size={16} aria-hidden/> Saved in your account</span>:null}
   </div>
   {error?<p role="alert" className="customer-profile-error">{error}</p>:null}
  </form>:null}
  <div className="customer-profile-assurance">
   <ShieldCheck size={17} aria-hidden/><p>Your preferences are stored only after you save. This page does not request wallet seeds, documents, bank details or permission to transfer funds.</p>
  </div>
  <div className="customer-profile-assurance">
   <LockKeyhole size={17} aria-hidden/><p>Signing out ends browser access. Full account recovery and multi-device profile linking are not yet enabled.</p>
  </div>
 </section>;
}
