import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
 validTeamInvitationDirectory,validTeamInviteAction,
 loadTeamInvitations,submitTeamInviteAction
} from "../src/lib/team-invites.ts";

const owner="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const invited="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const id="9a1a395f-249c-4907-b657-d48df4b38d28";
const org="0abf7c9e-249c-4907-b657-d48df4b38d29";
const item={id,organization_id:org,organization_name:"CI Only Business",
 peer_address:owner,role:"viewer",status:"pending",
 created_at_unix:1800000000,expires_at_unix:1800604800};
const data={schema_version:1,network:"testnet",source:"neon-team-invitations",
 account_address:invited,received:[item],sent:[],
 received_more:false,sent_more:false,business_verified:false,
 payment_execution_enabled:false,organization_payment_authorized:false};

test("strict viewer invite records cannot assert financial or compliance authority",()=>{
 assert.equal(validTeamInvitationDirectory(data,invited),true);
 assert.equal(validTeamInvitationDirectory({...data,received:[]},invited),true);
 for(const forged of [
  {...data,business_verified:true},
  {...data,payment_execution_enabled:true},
  {...data,organization_payment_authorized:true},
  {...data,source:"demo"},
  {...data,account_address:owner},
  {...data,received:[{...item,role:"admin"}]},
  {...data,received:[{...item,status:"accepted"}]},
  {...data,received:[{...item,peer_address:"G".repeat(56)}]},
  {...data,received:[{...item,expires_at_unix:1}]},
  {...data,received:[item,item]},
  {...data,received:[{...item,fee_claim_enabled:true}]}
 ]) assert.equal(validTeamInvitationDirectory(forged,invited),false);
});
test("client only permits viewer invitations and explicit accept/revoke, with exact fields",()=>{
 assert.equal(validTeamInviteAction({action:"create",organization_id:org,
  invited_account:invited,role:"viewer"}),true);
 for(const forged of [
  {action:"create",organization_id:org,invited_account:invited,role:"owner"},
  {action:"create",organization_id:org,invited_account:invited,role:"viewer",approve:true},
  {action:"accept",invitation_id:id,subject:owner},
  {action:"revoke",invitation_id:"../admin"},
  {action:"approve",invitation_id:id}
 ]) assert.equal(validTeamInviteAction(forged),false);
});
test("invitation GET/POST requires same-origin session, no asserted actor or wallet secret",async()=>{
 const actual=globalThis.fetch;const requests=[];
 try{
  globalThis.fetch=async (url,options)=>{
   requests.push({url,method:options.method,credentials:options.credentials,body:options.body});
   if(options.method==="GET")return new Response(JSON.stringify(data),{status:200});
   return new Response(null,{status:204});
  };
  assert.equal((await loadTeamInvitations(invited)).received[0].id,id);
  await submitTeamInviteAction({action:"accept",invitation_id:id});
  assert.deepEqual(requests.map(x=>[x.url,x.method,x.credentials]),[
   ["/api/account/team-invites","GET","same-origin"],
   ["/api/account/team-invites","POST","same-origin"]
  ]);
  assert.deepEqual(JSON.parse(requests[1].body),{action:"accept",invitation_id:id});
  await assert.rejects(()=>submitTeamInviteAction({action:"create",
   organization_id:org,invited_account:invited,role:"admin"}),TypeError);
 }finally{globalThis.fetch=actual;}
});
test("server proxy gates invitation actions with signed session, CSRF and release flag",async()=>{
 const content=await readFile("src/app/api/account/team-invites/route.ts","utf8");
 for(const part of [
  "currentWalletIdentity()","STEALTHBRIDGE_TEAM_INVITES_ENABLED",
  "validSameOrigin(request)","createHmac(\"sha256\"","randomUUID()",
  "validTeamInvitationDirectory(data,identity.address)",
  "AbortSignal.timeout(9000)","redirect:\"error\""
 ])assert.ok(content.includes(part),part);
 assert.doesNotMatch(content,/NEXT_PUBLIC_TEAM_INVITES|export async function PATCH|payment_execution_enabled:true/);
});
