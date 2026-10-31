#!/usr/bin/env node
// Self-contained public marketing verification. No backend, wallet or real funds.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
const PORT=3198,BASE="http://127.0.0.1:"+PORT;
const server=spawn(process.execPath,
 ["./node_modules/next/dist/bin/next","start","-p",String(PORT),"-H","127.0.0.1"],
 {env:{...process.env,STEALTHBRIDGE_SITE_MODE:"landing",STEALTHBRIDGE_API_URL:""},stdio:["ignore","pipe","pipe"]});
let logs="";
for(const stream of [server.stdout,server.stderr])stream.on("data",chunk=>{logs+=chunk.toString().slice(-2500);});
async function expectPage(path,words){
 const response=await fetch(BASE+path,{redirect:"manual",signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,200,path+" must be publicly available");
 const html=await response.text();
 for(const phrase of words)assert.ok(html.toLowerCase().includes(phrase.toLowerCase()),path+" missing "+phrase);
 assert.doesNotMatch(html,/<a\b[^>]*href="https:\/\/github\.com\//i,path+" links users to the codebase");
 assert.doesNotMatch(html,/href="[^"]*ROADMAP\.md"/i,path+" sends visitors to developer roadmap");
 assert.doesNotMatch(html,/href="\/preview\//i,path+" links to internal previews");
 console.log("PASS product page "+path+" (200; product content; no codebase redirects)");
}
try{
 let ready=false;
 for(let attempt=0;attempt<70;attempt++){
  if(server.exitCode!==null)throw new Error("Next.js exited before readiness");
  try{const res=await fetch(BASE+"/",{signal:AbortSignal.timeout(800)});if(res.ok){ready=true;break;}}catch{}
  await delay(300);
 }
 assert.ok(ready,"Server failed to start: "+logs);
 await expectPage("/",["StealthBridge","Money moves","Life stays yours","/business","/send","/platform"]);
 await expectPage("/business",["Confidentiality","means business","Sign in to StealthBridge","/login"]);
 await expectPage("/send",["Close to home","Across borders","Sign in to StealthBridge","/login"]);
 await expectPage("/login",["Sign in","Stellar","Continue with Freighter"]);
 await expectPage("/platform",["StealthBridge","Your money is personal","Payment services are in development"]);
 await expectPage("/discover/send",["StealthBridge Send","Close to home","In development"]);
 await expectPage("/discover/business",["StealthBridge Business","Confidentiality","In development"]);
 const logo=await fetch(BASE+"/brand/stealthbridge-symbol.svg");
 assert.equal(logo.status,200,"Logo asset must exist");
 for(const path of ["/explorer","/preview/business","/preview/send","/api/bridge/v1/network"]){
  const response=await fetch(BASE+path,{redirect:"manual"});
  assert.equal(response.status,404,path+" must remain private in public marketing mode");
  console.log("PASS private preview protection "+path);
 }
 console.log("PASS marketing site ready; payment actions remain unavailable");
}catch(e){
 console.error("Marketing verification FAILED",e);
 console.error(logs.slice(-5000));
 process.exitCode=1;
}finally{
 server.kill("SIGTERM");await delay(300);if(server.exitCode===null)server.kill("SIGKILL");
}
