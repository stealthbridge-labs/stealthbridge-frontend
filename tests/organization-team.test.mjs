import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validOrganizationTeam,loadOrganizationTeam} from "../src/lib/organization-team.ts";

const owner="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const other="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const id="9a1a395f-249c-4907-b657-d48df4b38d28";
const member=(account_address,role="owner")=>({account_address,role,joined_at_unix:1800000000});
const pending={schema_version:1,network:"testnet",source:"neon-organization-team",
 account_address:owner,organization:{id,display_name:"Operator Test",status:"pending",your_role:"owner"},
 members:[member(owner)],next_cursor:null,business_verified:false,
 invitation_issuance_enabled:false,payment_execution_enabled:false,
 organization_payment_authorized:false};

test("organization team is private metadata, never legal verification or financial authority",()=>{
 assert.equal(validOrganizationTeam(pending,id,owner),true);
 for(const forged of [
  {...pending,business_verified:true},
  {...pending,invitation_issuance_enabled:true},
  {...pending,payment_execution_enabled:true},
  {...pending,organization_payment_authorized:true},
  {...pending,network:"mainnet"},
  {...pending,account_address:other},
  {...pending,organization:{...pending.organization,status:"verified"}},
  {...pending,organization:{...pending.organization,your_role:"admin"}},
  {...pending,members:[member(owner),member(other,"viewer")]},
  {...pending,members:[member(other,"owner")]},
  {...pending,members:[{...member(owner),invite_status:"accepted"}]},
  {...pending,fx_quote:"1.25"}
 ])assert.equal(validOrganizationTeam(forged,id,owner),false);
 const active={...pending,organization:{...pending.organization,status:"active"},
  members:[member(other,"viewer"),member(owner)]};
 assert.equal(validOrganizationTeam(active,id,owner),true);
 assert.equal(validOrganizationTeam({...active,invitation_issuance_enabled:true},id,owner),true);
 assert.equal(validOrganizationTeam({...active,members:active.members.toReversed()},id,owner),false);
 assert.equal(validOrganizationTeam({...active,next_cursor:owner},id,owner),false);
});
test("private roster fetch uses verified same-origin session and no signing keys",async()=>{
 const real=globalThis.fetch,calls=[];
 try{
  globalThis.fetch=async (url,options)=>{
   calls.push({url,method:options.method,credentials:options.credentials,body:options.body});
   return new Response(JSON.stringify(pending),{status:200});
  };
  const value=await loadOrganizationTeam(id,owner);
  assert.equal(value.organization.status,"pending");
  assert.deepEqual(calls,[{url:"/api/account/organizations/"+id+"/team",method:"GET",credentials:"same-origin",body:undefined}]);
  await assert.rejects(()=>loadOrganizationTeam("../../admin",owner),TypeError);
  await assert.rejects(()=>loadOrganizationTeam(id,"invalid signer"),TypeError);
  await assert.rejects(()=>loadOrganizationTeam(id,owner,"fake cursor"),TypeError);
  globalThis.fetch=async()=>new Response(JSON.stringify({...pending,business_verified:true}),{status:200});
  await assert.rejects(()=>loadOrganizationTeam(id,owner),/could not be verified/);
 }finally{globalThis.fetch=real;}
});
test("private server proxy signs exact organization and cursor and bounds response",async()=>{
 const route=await readFile("src/app/api/account/organizations/[id]/team/route.ts","utf8");
 assert.match(route,/currentWalletIdentity\(\)/);
 assert.match(route,/createHmac\("sha256"/);
 assert.match(route,/STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET/);
 assert.match(route,/validOrganizationTeam\(data,id,session.address\)/);
 assert.match(route,/MAX_BYTES=32768/);
 assert.match(route,/redirect:"error"/);
 assert.match(route,/search.getAll\(key\).length!==1/);
 assert.doesNotMatch(route,/NEXT_PUBLIC_|export async function POST|export async function PATCH|submitPayment/);
});
