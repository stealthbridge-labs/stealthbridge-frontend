#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const REF="f8e8f719e10c8026bfbbd524a905a05635ff264e";
for(const [remote,local,limit] of [
 ["src/governance-administrator.ts","src/lib/governance-administrator.ts",14000],
 ["src/wallet.ts","src/lib/wallet.ts",3000]
]){
 const uri="https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-sdk/"+REF+"/"+remote;
 const response=await fetch(uri,{redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error("Pinned administrator SDK source is not available");
 const text=await response.text();
 if(text.length<100||text.length>limit)throw new Error("Unexpected administrator source size");
 const localSource=await readFile(local,"utf8");
 const adapted=remote==="src/governance-administrator.ts"?
   text.replace('import {canonicalStellarAccountAddress} from "./wallet.js";',
     'import {canonicalStellarAccountAddress} from "./stellar-address";'):text;
 assert.equal(localSource,adapted,"Frontend admin validation drift from reviewed SDK (only import path may differ)");
}
const content=await readFile("src/lib/governance-administrator.ts","utf8");
for(const marker of ["signer_possession_verified!==false","fee_collection_enabled!==false",
 "payment_execution_enabled!==false","reviewed_release_executable_hashes_confirmed!==true"]){
 assert.ok(content.includes(marker),"Fail-closed guard missing: "+marker);
}
console.log("PASS: current administrator reader matches pinned SDK, without signers or fees");
