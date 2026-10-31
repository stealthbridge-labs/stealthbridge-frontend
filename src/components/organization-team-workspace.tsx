"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Clock3,RefreshCw,ShieldCheck,UsersRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {loadOrganizationTeam,OrganizationTeamReadError,type OrganizationTeam} from "@/lib/organization-team";
import {OrganizationReference} from "@/components/organization-reference";
import {TeamInvitations} from "@/components/team-invitations";

type View={
 state:"loading"|"ready"|"error";
 data:OrganizationTeam|null;
 nextError:string|null;
 paging:boolean;
 problem?:"denied"|"session"|"unavailable";
};
const empty:View={state:"loading",data:null,nextError:null,paging:false};
const registeredOn=(seconds:number)=>
 new Date(seconds*1000).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
const roleContext={
 owner:"Organization owner record. No payment authority is granted here.",
 admin:"Organization administrator record. No payment authority is granted here.",
 operator:"Recorded operator role; payment execution is unavailable.",
 approver:"Recorded approver role; payment approvals are unavailable.",
 viewer:"Read-only access to permitted organization records. Cannot invite others."
};
const abbreviated=(address:string)=>address.slice(0,8)+"…"+address.slice(-6);

export function OrganizationTeamWorkspace({
 organizationId,address,invitationsEnabled
}:{organizationId:string;address:string;invitationsEnabled:boolean}){
 const [view,setView]=useState<View>(empty);
 const [revision,setRevision]=useState(0);
 const nextController=useRef<AbortController|null>(null);
 const refresh=useCallback(()=>{
  nextController.current?.abort();
  setView(empty);
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
   .catch(error=>{
    if(!controller.signal.aborted)
     setView({state:"error",data:null,nextError:null,paging:false,
      problem:error instanceof OrganizationTeamReadError?error.kind:"unavailable"});
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
      page.organization.display_name!==previous.data.organization.display_name||
      page.invitation_issuance_enabled!==previous.data.invitation_issuance_enabled)
     return {state:"error",data:null,paging:false,nextError:null,problem:"unavailable"};
    if(page.members.some(member=>seen.has(member.account_address)))
     return {...previous,paging:false,nextError:"Membership details changed while browsing. Refresh to recheck."};
    return {...previous,paging:false,nextError:null,
     data:{...page,members:[...previous.data.members,...page.members]}};
   });
  }catch(error){
   if(!controller.signal.aborted){
    if(error instanceof OrganizationTeamReadError&&error.kind!=="unavailable")
     setView({state:"error",data:null,paging:false,nextError:null,problem:error.kind});
    else setView(previous=>({...previous,paging:false,
     nextError:"Couldn't verify the next page. Your previous results are unchanged."}));
   }
  }
 }
 const organization=view.data?.organization;
 const canInvite=Boolean(invitationsEnabled&&view.data?.invitation_issuance_enabled&&
  organization?.status==="active"&&["owner","admin"].includes(organization.your_role));
 return <div className="team-workspace">
  <Link href="/app/business" className="team-back">
   <ArrowLeft size={16} aria-hidden/> Back to Business
  </Link>
  <div className="team-page-heading">
   <div>
    <span className="section-index">BUSINESS / ORGANIZATION DETAILS</span>
    <h1>Your organization and team.</h1>
    <p>Review your organization’s status, the people with recorded access, and what your role allows here.</p>
   </div>
   <span className="team-heading-symbol"><UsersRound size={28} aria-hidden/></span>
  </div>
  {view.state==="loading"?<div role="status" className="team-feedback">
   <Clock3 size={22} aria-hidden/><p>Checking the live organization record…</p>
  </div>:null}
  {view.state==="error"?<div role="alert" className="team-feedback">
   <ShieldCheck size={23} aria-hidden/><h2>{view.problem==="denied"?"Team access not available.":
    view.problem==="session"?"Sign in again to view your team.":"Organization details unavailable."}</h2>
   <p>{view.problem==="denied"?
    "This organization may not be available to your account. Team details require an active owner or administrator membership, or ownership of your pending application.":
    view.problem==="session"?"Your session could not be verified. Sign in again before reviewing organization records.":
    "We couldn't verify the current organization record or permissions. Refresh to try again. Team details and invitations are hidden until verified."}</p>
   {view.problem==="session"?<Link href="/login" className="team-open-link">Sign in</Link>:null}
   <Button type="button" variant="outline" onClick={refresh}>
    <RefreshCw size={16} aria-hidden/> Try again
   </Button>
  </div>:null}
  {view.state==="ready"&&view.data?<>
   <section className="team-overview" aria-labelledby="team-org-name">
    <div>
     <span className="section-index">YOUR BUSINESS WORKSPACE</span>
     <h2 id="team-org-name">{view.data.organization.display_name}</h2>
     <p>{view.data.organization.status==="pending"?
      "Your application is saved. Organization activation is still pending.":
      "Your organization is internally active. This status does not establish legal or regulatory verification."}</p>
     <OrganizationReference id={view.data.organization.id}/>
    </div>
    <div className="team-overview-status">
     <span className={view.data.organization.status==="pending"?"team-pill team-pill-pending":"team-pill"}>
      <Clock3 size={14} aria-hidden/>
      {view.data.organization.status==="pending"?"Application pending":"Workspace active"}
     </span>
     <p>Your recorded role: <strong>{view.data.organization.your_role}</strong></p>
    </div>
   </section>
   <section className="team-access" aria-labelledby="team-access-title">
    <div><span className="section-index">YOUR ACCESS</span>
     <h2 id="team-access-title">{organization?.your_role==="owner"?"Owner":"Administrator"} access</h2>
     <p>{organization?.status==="pending"?
      "You can review your own application and membership. Return to Business to see available application actions.":
      "You can review the team roster and recorded roles for this organization."}</p>
    </div>
    <ul>
     <li>{canInvite?"You can offer viewer access and revoke pending invitations below.":
      "You cannot issue invitations from this workspace right now."}</li>
     <li>Role changes and removal of existing members are not available here.</li>
     <li>Recorded roles do not authorize payments, settlement or financial approvals.</li>
    </ul>
   </section>
   <div className="team-columns">
    <section className="team-roster" aria-labelledby="team-members-title">
     <div className="team-panel-heading">
      <div><span className="section-index">TEAM MEMBERSHIP</span>
       <h2 id="team-members-title">Who's on your team</h2>
       <p>{organization?.status==="pending"?
        "Only your applicant membership is shown while this organization is pending.":
        "Current membership records available to your account. Names and identity verification are not provided by these records."}</p>
      </div>
      <Button variant="outline" type="button" size="sm" onClick={refresh}
       disabled={view.paging}><RefreshCw size={15} aria-hidden/> Refresh</Button>
     </div>
     {view.data.members.length===0?
      <p className="team-empty">No members on this page. Refresh to verify the roster.</p>:
      <ul className="team-member-list" aria-label="Recorded team members">
       {view.data.members.map(member=><li key={member.account_address} className="team-member">
        <div className="team-member-avatar" aria-hidden>{member.account_address.slice(1,3)}</div>
        <div className="team-member-main">
         <strong>{member.account_address===address?"You":"Team member"}</strong>
         <code>{abbreviated(member.account_address)}</code>
         <p className="team-role-context">{roleContext[member.role]}</p>
         <details className="team-account-details"><summary>View member account</summary>
          <code>{member.account_address}</code>
         </details>
         <span>Recorded {registeredOn(member.joined_at_unix)}</span>
        </div>
        <span className="team-member-role">{member.role}</span>
       </li>)}
      </ul>}
     <p className="team-roster-end" role="status">{view.data.members.length} membership {view.data.members.length===1?"record":"records"} shown{view.data.next_cursor?"; more may be available.":"."}</p>
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
     <h2 id="team-readiness-title">Organization review</h2>
     <div className="team-readiness-item">
      <Clock3 size={20} aria-hidden/><div><strong>Registration</strong>
       <p>{view.data.organization.status==="pending"?
        "Your application exists, but it has not been activated.":
        "The workspace is active internally. That does not establish legal verification."}</p>
      </div>
     </div>
     <div className="team-readiness-item">
      <ShieldCheck size={20} aria-hidden/><div><strong>Business verification</strong>
       <p>Not verified. No KYC, legal-entity or regulatory approval is established by these records.</p></div>
     </div>
     <div className="team-readiness-item">
      <UsersRound size={20} aria-hidden/><div><strong>Team invitations</strong>
       <p>{canInvite?
        "Viewer invitations are enabled for your current role. Check the live invitation records below; an offer becomes membership only after acceptance.":
        organization?.status==="pending"?
        "Unavailable while your application is pending. Activation is required before an owner or administrator can invite viewers.":
        !invitationsEnabled?"Invitations are not enabled on this site. Your existing membership records remain available to review.":
        "Invitation issuance is not enabled for this organization. No invitation permission has been assumed."}</p></div>
     </div>
     <div className="team-readiness-item">
      <ShieldCheck size={20} aria-hidden/><div><strong>International payments</strong>
       <p>Transfers, settlement, fiat payouts and platform fee claims remain disabled.</p></div>
     </div>
    </section>
   </div>
   {canInvite?
     <TeamInvitations organizationId={organizationId} address={address}/>:null}
   <div className="team-security-note">
    <ShieldCheck size={18} aria-hidden/><p>Organization roles describe recorded membership only. Even an owner of an active workspace is not automatically a verified business, authorized payment operator, or Stellar contract administrator. This screen never requests transaction signatures.</p>
   </div>
  </>:null}
 </div>;
}
