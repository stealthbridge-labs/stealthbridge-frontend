import {canonicalStellarAccountAddress} from "./stellar-address.ts";

export type TeamInviteRecord={
 id:string;organization_id:string;organization_name:string;
 peer_address:string;role:"viewer";status:"pending"|"accepted"|"revoked"|"expired";
 created_at_unix:number;expires_at_unix:number
};
export type TeamInvitationDirectory={
 schema_version:1;network:"testnet";source:"neon-team-invitations";
 account_address:string;received:TeamInviteRecord[];sent:TeamInviteRecord[];
 received_more:boolean;sent_more:boolean;
 business_verified:false;payment_execution_enabled:false;
 organization_payment_authorized:false
};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const fields=(value:Record<string,unknown>,names:string[])=>
 Object.keys(value).length===names.length&&names.every(x=>Object.hasOwn(value,x));
export function validTeamInvitationDirectory(value:unknown,address:string):value is TeamInvitationDirectory{
 const verified=canonicalStellarAccountAddress(address);
 if(!verified||!value||typeof value!=="object"||Array.isArray(value))return false;
 const directory=value as Record<string,unknown>;
 if(!fields(directory,["schema_version","network","source","account_address",
  "received","sent","received_more","sent_more","business_verified",
  "payment_execution_enabled","organization_payment_authorized"])||
  directory.schema_version!==1||directory.network!=="testnet"||
  directory.source!=="neon-team-invitations"||
  directory.account_address!==verified||
  directory.business_verified!==false||
  directory.payment_execution_enabled!==false||
  directory.organization_payment_authorized!==false||
  typeof directory.received_more!=="boolean"||
  typeof directory.sent_more!=="boolean"||
  !Array.isArray(directory.received)||!Array.isArray(directory.sent)||
  directory.received.length>20||directory.sent.length>20)return false;
 for(const list of [directory.received,directory.sent] as unknown[][]){
  const ids=new Set<string>();
  for(const value of list){
   if(!value||typeof value!=="object"||Array.isArray(value))return false;
   const row=value as Record<string,unknown>;
   if(!fields(row,["id","organization_id","organization_name","peer_address",
    "role","status","created_at_unix","expires_at_unix"])||
    typeof row.id!=="string"||!UUID.test(row.id)||
    ids.has(row.id)||
    typeof row.organization_id!=="string"||!UUID.test(row.organization_id)||
    typeof row.organization_name!=="string"||
    row.organization_name.trim()!==row.organization_name||
    !row.organization_name||row.organization_name.length>120||
    typeof row.peer_address!=="string"||
    canonicalStellarAccountAddress(row.peer_address)!==row.peer_address||
    row.role!=="viewer"||
    !["pending","accepted","revoked","expired"].includes(String(row.status))||
    !Number.isSafeInteger(row.created_at_unix)||Number(row.created_at_unix)<=0||
    !Number.isSafeInteger(row.expires_at_unix)||
    Number(row.expires_at_unix)<=Number(row.created_at_unix))return false;
   ids.add(row.id);
   if(list===directory.received&&row.status!=="pending")return false;
   if(list===directory.received&&row.peer_address===verified)return false;
  }
 }
 return true;
}
export async function loadTeamInvitations(address:string,signal?:AbortSignal):Promise<TeamInvitationDirectory>{
 const response=await fetch("/api/account/team-invites",{
  method:"GET",cache:"no-store",credentials:"same-origin",signal
 });
 if(!response.ok)throw Error("Team invitations are not available.");
 const value:unknown=await response.json();
 if(!validTeamInvitationDirectory(value,address))throw Error("Team invitations could not be verified.");
 return value;
}
export type TeamInviteAction=
 |{action:"create";organization_id:string;invited_account:string;role:"viewer"}
 |{action:"accept";invitation_id:string}
 |{action:"revoke";invitation_id:string};
export function validTeamInviteAction(value:unknown):value is TeamInviteAction{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const action=value as Record<string,unknown>;
 if(action.action==="create")return fields(action,["action","organization_id","invited_account","role"])&&
  typeof action.organization_id==="string"&&UUID.test(action.organization_id)&&
  action.role==="viewer"&&typeof action.invited_account==="string"&&
  canonicalStellarAccountAddress(action.invited_account)===action.invited_account;
 if(action.action==="accept"||action.action==="revoke")return fields(action,["action","invitation_id"])&&
  typeof action.invitation_id==="string"&&UUID.test(action.invitation_id);
 return false;
}
export async function submitTeamInviteAction(action:TeamInviteAction):Promise<void>{
 if(!validTeamInviteAction(action))throw new TypeError("Invalid viewer invitation request.");
 const response=await fetch("/api/account/team-invites",{
  method:"POST",cache:"no-store",credentials:"same-origin",
  headers:{"content-type":"application/json"},body:JSON.stringify(action)
 });
 if(response.status===204)return;
 if(response.status===409)throw Error("The invitation already exists, expired, or its membership changed. Refresh to check.");
 if(response.status===401||response.status===403)throw Error("Your session or organization permissions no longer allow this action.");
 throw Error("This invitation action could not be completed.");
}
