"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Building2,CheckCircle2,RefreshCw,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {getAccountDirectory,type AccountDirectory} from "@/lib/account-directory";

export function AccountOrganizations({address}:{address:string}){
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 const [directory,setDirectory]=useState<AccountDirectory|null>(null);
 const [revision,refresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setDirectory(null);setStatus("loading");
  void getAccountDirectory(address,controller.signal)
   .then(value=>{if(!controller.signal.aborted){setDirectory(value);setStatus("ready");}})
   .catch(()=>{if(!controller.signal.aborted)setStatus("error");});
  return ()=>controller.abort();
 },[address,revision]);
 return <section aria-labelledby="my-organizations-title" className="account-organizations">
  <div className="account-org-heading"><div>
   <span className="section-index">YOUR ORGANIZATIONS</span>
   <h2 id="my-organizations-title">Business access, in one place.</h2>
   <p>View organizations that have actually granted this account an active membership. No company or role is created by signing in.</p>
  </div><Button variant="outline" size="sm" onClick={()=>refresh(value=>value+1)}>
   <RefreshCw size={15} aria-hidden/> Refresh
  </Button></div>
  {status==="loading"?<p role="status" className="account-directory-notice">Checking current organization access…</p>:null}
  {status==="error"?<div className="account-directory-notice" role="alert">
   <strong>Organization access is temporarily unavailable.</strong>
   <p>We couldn't verify your memberships with our backend. Nothing has been assumed or recreated. Try refreshing.</p>
  </div>:null}
  {status==="ready"&&directory?.organizations.length===0?
   <div className="account-directory-empty" role="status"><Building2 size={29} aria-hidden/>
    <div><strong>No organizations are linked to this account yet.</strong>
     <p>Business workspace access needs a real organization and a verified membership. Signing in doesn't automatically approve a business.</p>
    </div>
   </div>:null}
  {status==="ready"&&directory&&directory.organizations.length>0?
   <div className="account-org-grid">
    {directory.organizations.map(org=><article key={org.id} className="account-org-card">
     <span className="account-org-icon"><Building2 size={22} aria-hidden/></span>
     <span className="account-org-verified"><CheckCircle2 size={14} aria-hidden/> Current membership</span>
     <h3>{org.display_name}</h3>
     <p><strong>Account role:</strong> {org.role}</p>
     <p className="account-org-id">Organization ID: {org.id}</p>
     <span className="account-org-warning"><ShieldCheck size={14} aria-hidden/>
      Membership does not authorize financial execution</span>
     {["owner","admin"].includes(org.role)?
      <Link href={"/app/business/"+org.id} className="team-open-link">
       View team and status <ArrowRight size={16} aria-hidden/>
      </Link>:null}
    </article>)}
    {directory.has_more?<p className="account-directory-notice">Showing the first 25 active memberships. Additional organization paging is not yet enabled.</p>:null}
   </div>:null}
 </section>;
}
