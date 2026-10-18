#!/usr/bin/env node
// Protected deployment policy smoke: marketing pages only, no network account
// data, wallet login, transfer execution, secrets or personal data.
import assert from "node:assert/strict";

const raw=process.argv[2]??process.env.STEALTHBRIDGE_MARKETING_WEB_URL;
if(!raw)throw new Error("Configure an exact marketing deployment URL.");
const origin=new URL(raw);
const local=["localhost","127.0.0.1"].includes(origin.hostname);
if(!(origin.protocol==="https:"||(origin.protocol==="http:"&&local))||
   origin.username||origin.password||origin.hash||origin.search||
   !["","/"].includes(origin.pathname)||!(origin.port===""||local)){
 throw new Error("Marketing origin must be HTTPS without URL credentials, query, path or fragment.");
}
const token=process.env.STEALTHBRIDGE_VERCEL_BYPASS_TOKEN;
if(token){
 const approved=process.env.STEALTHBRIDGE_ALLOWED_DEPLOYMENT_HOST;
 if(!(origin.hostname.endsWith(".vercel.app")||
     (approved&&origin.hostname===approved))) {
  throw new Error("Protected credentials may only be sent to an explicitly approved Vercel host.");
 }
 if(token.length>512||!/^[A-Za-z0-9._~-]+$/.test(token))
  throw new Error("Invalid protected-deployment token format.");
}
const headers=token?{"x-vercel-protection-bypass":token}:{};
const probe=async(path,method="GET")=>{
 const res=await fetch(new URL(path,origin),{
  method,headers:method==="GET"?headers:{...headers,"content-type":"application/json"},
  ...(method==="POST"?{body:"{}"}:{}),
  redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(12000)
 });
 if(res.status>=300&&res.status<400)throw new Error(path+" unexpectedly redirected");
 await res.body?.cancel().catch(()=>{});
 return res.status;
};

for(const p of ["/","/business","/send","/platform","/protocol"]){
 assert.equal(await probe(p),200,"Marketing public page "+p+" must be served");
 console.log("PASS marketing page "+p);
}
for(const p of ["/preview","/preview/business","/preview/send","/preview/contracts",
  "/preview/corridors","/api/bridge/v1/network","/api/bridge/v1/capabilities",
  "/api/bridge/ready"]){
 assert.equal(await probe(p),404,"Production policy leaked technical preview or API GET at "+p);
 console.log("PASS hidden preview/API "+p);
}
assert.equal(await probe("/api/bridge/v1/settlements","POST"),405,
 "Marketing must reject settlement POST, not forward a write to backend.");
console.log("PASS settlement POST returns 405; marketing release is isolated.");
