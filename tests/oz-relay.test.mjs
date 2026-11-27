import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validOzRelaySubmission,relayError} from "../src/lib/oz-relay.ts";

const ok={func:"AAAAAw==",auth:["AAAAAQ=="]};
test("relay BFF accepts only the kit's {func, auth} base64 shape",()=>{
 assert.equal(validOzRelaySubmission(ok),true);
 assert.equal(validOzRelaySubmission({...ok,xdr:"AAAA"}),false);
 assert.equal(validOzRelaySubmission({func:ok.func,auth:[]}),false);
 assert.equal(validOzRelaySubmission({func:ok.func,auth:Array(9).fill("AAAA")}),false);
 assert.equal(validOzRelaySubmission({func:"<script>",auth:ok.auth}),false);
 assert.equal(validOzRelaySubmission({func:"A".repeat(70_000),auth:ok.auth}),false);
});
test("relay errors use smart-account-kit's response fields",()=>{
 assert.deepEqual(relayError("SESSION_REQUIRED"),{success:false,error:"SESSION_REQUIRED",errorCode:"SESSION_REQUIRED"});
});
test("relay route requires a session and same origin, and signs with its own domain",async()=>{
 const route=await readFile("src/app/api/account/smart-accounts/oz/relay/route.ts","utf8");
 assert.match(route,/currentWalletIdentity\(\)/);
 assert.match(route,/validSameOrigin\(request\)/);
 assert.match(route,/stealthbridge-oz-relay-v1/);
 assert.match(route,/redirect: "error"/);
 assert.doesNotMatch(route,/export async function GET/);
});
