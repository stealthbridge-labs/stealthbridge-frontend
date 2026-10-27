"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Clock3,RefreshCw,ShieldCheck,UsersRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {loadOrganizationTeam,type OrganizationTeam} from "@/lib/organization-team";
import {TeamInvitations} from "@/components/team-invitations";

type View={
 state:"loading"|"ready"|"error";
 data:OrganizationTeam|null;
 nextError:string|null;
 paging:boolean;
};
const empty:View={state:"loading",data:null,nextError:null,paging:false};
const registeredOn=(seconds:number)=>
 new Date(seconds*1000).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
const abbreviated=(address:string)=>address.slice(0,8)+"…"+address.slice(-6);

export function OrganizationTeamWorkspace({
 organizationId,address,invitationsEnabled
}:{organizationId:string;address:string;invitationsEnabled:boolean}){
 const [view,setView]=useState<View>(empty);
 const [revision,setRevision]=useState(0);
 const nextController=useRef<AbortController|null>(null);
 const refresh=useCallback(()=>{
  nextController.current?.abort();
  setRevision(current=>current+1);
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  nextController.current?.abort();
  setView(empty);
  void loadOrganizationTeam(organizationId,address,undefined,controller.signal)
   .then(data=>{
    if(!controller.signal.aborted)
     setView({state:"ready",data,nextError:null,paging:false});
   })
   .catch(()=>{
    if(!controller.signal.aborted)
     setView({state:"error",data:null,nextError:null,paging:false});
   });
  return ()=>{controller.abort();nextController.current?.abort();};
 },[organizationId,address,revision]);
 async function more(){
  if(view.state!=="ready"||!view.data?.next_cursor||view.paging)return;
  const after=view.data.next_cursor;
  nextController.current?.abort();
  const controller=new AbortController();
  nextController.current=controller;
  setView(previous=>({...previous,paging:true,nextError:null}));
  try{
   const page=await loadOrganizationTeam(organizationId,address,after,controller.signal);
   if(controller.signal.aborted)return;
   setView(previous=>{
    if(!previous.data)return previous;
    const seen=new Set(previous.data.members.map(item=>item.account_address));
    if(page.organization.id!==previous.data.organization.id||
      page.organization.status!==previous.data.organization.status||
      page.organization.your_role!==previous.data.organization.your_role||
      page.members.some(member=>seen.has(member.account_address)))
     return {...previous,paging:false,nextError:"Membership details changed while browsing. Refresh to recheck."};
    return {...previous,paging:false,nextError:null,
     data:{...page,members:[...previous.data.members,...page.members]}};
   });
  }catch{
   if(!controller.signal.aborted)
    setView(previous=>({...previous,paging:false,
     nextError:"Couldn't verify the next page. Your previous results are unchanged."}));
  }
 }
 return <div className="team-workspace">
  <Link href="/app/business" className="team-back">
   <ArrowLeft size={16} aria-hidden/> All business applications
  </Link>
  <div className="team-page-heading">
   <div>
    <span className="section-index">BUSINESS / ORGANIZATION DETAILS</span>
    <h1>People, roles, and progress.</h1>
    <p>See who's recorded in your organization, review your current onboarding state, and understand the controls still being built.</p>
   </div>
   <span className="team-heading-symbol"><UsersRound size={28} aria-hidden/></span>
  </div>
  {view.state==="loading"?<div role="status" className="team-feedback">
   <Clock3 size={22} aria-hidden/><p>Checking the live organization record…</p>
  </div>:null}
  {view.state==="error"?<div role="alert" className="team-feedback">
   <ShieldCheck size={23} aria-hidden/><h2>Organization details unavailable.</h2>
   <p>We couldn't verify access or retrieve this organization's records. No substitute data has been displayed.</p>
   <Button type="button" variant="outline" onClick={refresh}>
    <RefreshCw size={16} aria-hidden/> Try again
   </Button>
  </div>:null}
  {view.state==="ready"&&view.data?<>
   <section className="team-overview" aria-labelledby="team-org-name">
    <div>
     <span className="section-index">YOUR BUSINESS WORKSPACE</span>
     <h2 id="team-org-name">{view.data.organization.display_name}</h2>
     <p>Reference: <code>{view.data.organization.id}</code></p>
    </div>
    <div className="team-overview-status">
     <span className={view.data.organization.status==="pending"?"team-pill team-pill-pending":"team-pill"}>
      <Clock3 size={14} aria-hidden/>
      {view.data.organization.status==="pending"?"Application pending":"Workspace active"}
     </span>
     <p>Your recorded role: <strong>{view.data.organization.your_role}</strong></p>
    </div>
   </section>
   <div className="team-columns">
    <section className="team-roster" aria-labelledby="team-members-title">
     <div className="team-panel-heading">
      <div><span className="section-index">TEAM MEMBERSHIP</span>
       <h2 id="team-members-title">Who's on your team</h2>
       <p>Records from your organization's membership database. Only authorized owners and administrators can view this directory.</p>
      </div>
      <Button variant="outline" type="button" size="sm" onClick={refresh}
       disabled={view.paging}><RefreshCw size={15} aria-hidden/> Refresh</Button>
     </div>
     {view.data.members.length===0?
      <p className="team-empty">No members on this page. Refresh to verify the roster.</p>:
      <div className="team-member-list">
       {view.data.members.map(member=><article key={member.account_address} className="team-member">
        <div className="team-member-avatar" aria-hidden>{member.account_address.slice(1,3)}</div>
        <div className="team-member-main">
         <strong>{member.account_address===address?"You":"Team member"}</strong>
         <code title={member.account_address}>{abbreviated(member.account_address)}</code>
         <span>Recorded {registeredOn(member.joined_at_unix)}</span>
        </div>
        <span className="team-member-role">{member.role}</span>
       </article>)}
      </div>}
     {view.data.next_cursor?<div className="team-load">
      <p>More members may be recorded in this organization.</p>
      <Button type="button" variant="outline" disabled={view.paging}
       onClick={()=>void more()}>{view.paging?"Loading members…":"Load more members"}
       <ArrowRight size={16} aria-hidden/></Button>
     </div>:<p className="team-roster-end">End of currently accessible membership records.</p>}
     {view.nextError?<p role="alert" className="team-error">{view.nextError}</p>:null}
    </section>
    <section className="team-readiness" aria-labelledby="team-readiness-title">
     <span className="section-index">TRUST & CONTROLS</span>
     <h2 id="team-readiness-title">Clear steps. Clear boundaries.</h2>
     <div className="team-readiness-item">
      <Clock3 size={20} aria-hidden/><div><strong>Registration</strong>
       <p>{view.data.organization.status==="pending"?
        "Your application exists, but it has not been activated.":
        "The workspace is active internally. That does not establish legal verification."}</p>
      </div>
     </div>
     <div className="team-readiness-item">
      <ShieldCheck size={20} aria-hidden/><div><strong>Business verification</strong>
       <p>Not verified. No legal-entity or regulatory approval is asserted.</p></div>
     </div>
     <div className="team-readiness-item">
      <UsersRound size={20} aria-hidden/><div><strong>Team invitations</strong>
       <p>Not yet enabled. Membership records can be viewed but not edited here.</p></div>
     </div>
     <div className="team-readiness-item">
      <ShieldCheck size={20} aria-hidden/><div><strong>International payments</strong>
       <p>Transfers, settlement, fiat payouts and platform fee claims remain disabled.</p></div>
     </div>
    </section>
   </div>
   {invitationsEnabled&&view.data.organization.status==="active"&&
    ["owner","admin"].includes(view.data.organization.your_role)?
     <TeamInvitations organizationId={organizationId} address={address}/>:null}
   <div className="team-security-note">
    <ShieldCheck size={18} aria-hidden/><p>Organization roles describe recorded membership only. Even an owner of an active workspace is not automatically a verified business, authorized payment operator, or Stellar contract administrator. This screen never requests transaction signatures.</p>
   </div>
  </>:null}
 </div>;
}
