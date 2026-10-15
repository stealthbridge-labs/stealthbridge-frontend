import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {canonicalBusinessEnvelope,digestBusinessEnvelope} from "../src/lib/business-envelope.ts";
const item=()=>({
 organization:"a12ef783-d60b-4427-aa62-d2562acd4cef",
 actor:"GTESTMAKER000000001", operation:"invoice-review",
 reference:"INVOICE_001",requestKey:"synthetic_business_request_0001",
});
test("frontend review identity matches SDK and Rust SHA-256 test vector",async()=>{
 const value=await digestBusinessEnvelope(item());
 assert.equal(value.sha256,"ca2561966d4cc43cb2593fe2fb151ab31ba7d6aefd15363975d053a8b13d4b36");
 assert.equal(value.sha256,createHash("sha256").update(canonicalBusinessEnvelope(item())).digest("hex"));
 assert.equal(value.financialExecutionAuthorized,false);
});
test("draft references reject ambiguous separators and unsafe characters",()=>{
 for(const reference of ["short","INVOICE\nnetwork:public","x".repeat(65)," has-space"]){
  assert.throws(()=>canonicalBusinessEnvelope({...item(),reference}),TypeError);
 }
});
test("business fingerprint controls are preview-only and cannot submit financial writes",async()=>{
 const route=await readFile("src/app/preview/approvals/page.tsx","utf8");
 const ui=await readFile("src/components/business-review-workspace.tsx","utf8");
 assert.match(route,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(ui,/digestBusinessEnvelope/);
 assert.match(ui,/Unsigned draft SHA-256 fingerprint/);
 assert.doesNotMatch(ui, /signTransaction|submitPayment|sendTransaction/);
});
