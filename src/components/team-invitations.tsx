"use client";
import {useEffect,useState,type FormEvent} from "react";
import {Clock3,RefreshCw,ShieldCheck,UserPlus,UsersRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
 loadTeamInvitations,submitTeamInviteAction,
 validTeamInviteAction,type TeamInvitationDirectory
} from "@/lib/team-invites";
import {canonicalStellarAccountAddress} from "@/lib/stellar-address";

export function TeamInvitations({
 address,organizationId
}:{address:string;organizationId?:string}){
 const [value,setValue]=useState<TeamInvitationDirectory|null>(null);
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 const [revision,setRevision]=useState(0);
 const [recipient,setRecipient]=useState("");
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  setStatus("loading");setValue(null);
  void loadTeamInvitations(address,controller.signal)
   .then(data=>{if(!controller.signal.aborted){setValue(data);setStatus("ready");}})
   .catch(()=>{if(!controller.signal.aborted)setStatus("error");});
  return ()=>controller.abort();
 },[address,revision]);
 function refresh(){setRevision(v=>v+1);}
 async function perform(action:Parameters<typeof submitTeamInviteAction>[0]){
  if(working||!validTeamInviteAction(action))return;
  setWorking(true);setMessage("");setError("");
  try{
   await submitTeamInviteAction(action);
   setRecipient("");
   setMessage(action.action==="create"?
    "Viewer invitation created. The recipient can review it after signing in with that Stellar account.":
    action.action==="accept"?
    "Invitation accepted. Your new membership will appear when the account directory refreshes.":
    "Invitation revoked. The existing invitation can no longer be accepted.");
   refresh();
  }catch(e){setError(e instanceof Error?e.message:"The invitation action failed.");}
  finally{setWorking(false);}
 }
 const invitee=canonicalStellarAccountAddress(recipient);
 const received=value?.received??[];
 const sent=(value?.sent??[]).filter(v=>v.organization_id===organizationId);
 return <section className="team-invite-panel" aria-label={
  organizationId?"Viewer invitations for your organization":"Invitations to join organizations"
 }>
  <div className="team-invite-header">
   <div><span className="section-index">TEAM ACCESS / OPT-IN</span>
    <h2>{organizationId?"Invite a viewer":"Invitations for you"}</h2>
    <p>{organizationId?
     "Offer read-only organizational access to a verified Stellar public account. Only owners and administrators of active workspaces can invite.":
     "Only you can accept an invitation addressed to your signed-in Stellar account. Accepting grants viewer access to that organization, not payment authority."}</p>
   </div>
   <Button type="button" size="sm" variant="outline" disabled={working||status==="loading"}
    onClick={refresh}><RefreshCw size={15} aria-hidden/> Refresh</Button>
  </div>
  {status==="loading"?<p role="status" className="team-invite-subtle">Checking real invitation records…</p>:null}
  {status==="error"?<div role="alert" className="team-invite-alert">
   <p>Invitations cannot be verified right now. Nothing has been added to your team.</p>
   <Button type="button" variant="outline" size="sm" onClick={refresh}>Try again</Button>
  </div>:null}
  {status==="ready"&&organizationId&&value?<>
   <form className="team-invite-form" onSubmit={(event:FormEvent)=>{
    event.preventDefault();
    if(invitee&&invitee!==address)
     void perform({action:"create",organization_id:organizationId,invited_account:invitee,role:"viewer"});
   }}>
    <label htmlFor={"team-invite-recipient-"+organizationId}>Recipient's Stellar G-address</label>
    <input id={"team-invite-recipient-"+organizationId} required
     value={recipient} placeholder="G…" autoComplete="off" spellCheck={false}
     onChange={e=>setRecipient(e.target.value.toUpperCase())} maxLength={56}/>
    <p>Viewer only. The recipient must explicitly accept, and the invitation expires in seven days. Wallet signing and payment approvals are never requested.</p>
    <Button type="submit" disabled={working||!invitee||invitee===address}>
     <UserPlus size={16} aria-hidden/> {working?"Sending invitation…":"Invite viewer"}
    </Button>
   </form>
   <div className="team-invite-list">
    <h3>Invitations issued by your organization</h3>
    {sent.length===0?<p>No team invitations have been issued in the available records.</p>:sent.map(row=>
     <article className="team-invite-item" key={row.id}>
      <div><strong>{row.peer_address.slice(0,11)}…{row.peer_address.slice(-6)}</strong>
       <p>Viewer · {row.status} · expires {new Date(row.expires_at_unix*1000).toLocaleDateString()}</p></div>
      {row.status==="pending"?<Button variant="outline" type="button" size="sm"
       disabled={working} onClick={()=>void perform({action:"revoke",invitation_id:row.id})}>
       Revoke invitation
      </Button>:null}
     </article>)}
    {value.sent_more?<p>Additional invitations are not included in this first page.</p>:null}
   </div>
  </>:null}
  {status==="ready"&&!organizationId&&value?<div className="team-invite-list">
   {received.length===0?<div className="team-invite-empty">
    <UsersRound size={22} aria-hidden/><p>You have no pending invitations for this account.</p>
   </div>:received.map(row=><article className="team-invite-item" key={row.id}>
    <div><strong>{row.organization_name}</strong>
     <p>Viewer access · invited by {row.peer_address.slice(0,11)}…</p>
     <p><Clock3 size={13} aria-hidden/> Expires {new Date(row.expires_at_unix*1000).toLocaleDateString()}</p></div>
    <Button type="button" size="sm" disabled={working}
     onClick={()=>void perform({action:"accept",invitation_id:row.id})}>
     Accept viewer invitation
    </Button>
   </article>)}
   {value.received_more?<p>More invitations may be available. Contact your organization administrator.</p>:null}
  </div>:null}
  {message?<p className="team-invite-success" role="status">{message}</p>:null}
  {error?<p className="team-invite-alert" role="alert">{error}</p>:null}
  <p className="team-invite-safety"><ShieldCheck size={17} aria-hidden/>
   A viewer may read permitted organizational records but cannot invite others, initiate settlements or authorize financial transfers. Organization activation, legal verification, custody and payouts are independent.</p>
 </section>;
}
