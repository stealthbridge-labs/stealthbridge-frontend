import {test} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
async function fixture({leakPreview=false,leakApi=false,writeEnabled=false,redirect=false}={}){
 const requests=[];
 const server=createServer((req,res)=>{
  requests.push(req.method+" "+req.url);
  if(redirect&&req.url==="/"){res.writeHead(302,{Location:"https://malicious.invalid"});return res.end();}
  const page=["/","/business","/send","/platform","/protocol"].includes(req.url);
  const preview=String(req.url).startsWith("/preview");
  const api=String(req.url).startsWith("/api/bridge");
  const status=page?200:preview&&leakPreview?200:
   api&&req.method==="GET"&&leakApi?200:
   api&&req.method==="POST"?(writeEnabled?200:405):404;
  res.writeHead(status,{"content-type":"text/plain"});
  res.end("StealthBridge synthetic fixture");
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const address=server.address();
 const url="http://127.0.0.1:"+address.port;
 let output="";
 const code=await new Promise(resolve=>{
  const child=spawn(process.execPath,["scripts/smoke-marketing.mjs",url],{
   cwd:root,env:{...process.env,STEALTHBRIDGE_VERCEL_BYPASS_TOKEN:""},
  });
  child.stdout.on("data",x=>output+=x);
  child.stderr.on("data",x=>output+=x);
  child.on("close",resolve);
 });
 await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 return {code,output,requests};
}
test("marketing deploy hides preview/API routes and disables settlement writes",async()=>{
 const result=await fixture();
 assert.equal(result.code,0,result.output);
 assert.equal(result.requests.filter(x=>x.startsWith("POST ")).length,1);
 assert.ok(result.output.includes("PASS settlement POST returns 405"));
});
test("production leak of preview route is a release failure",async()=>{
 const result=await fixture({leakPreview:true});
 assert.notEqual(result.code,0);
 assert.match(result.output,/leaked technical preview/);
});
test("public API leak is a release failure",async()=>{
 const result=await fixture({leakApi:true});
 assert.notEqual(result.code,0);
 assert.match(result.output,/leaked technical preview/);
});
test("settlement HTTP 200 is a release failure",async()=>{
 const result=await fixture({writeEnabled:true});
 assert.notEqual(result.code,0);
 assert.match(result.output,/Marketing must reject settlement POST/);
});
test("redirects cannot forward protected browser credentials",async()=>{
 const result=await fixture({redirect:true});
 assert.notEqual(result.code,0);
 assert.match(result.output,/unexpectedly redirected/);
});
