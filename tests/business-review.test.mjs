import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {assessBusinessReview,BusinessReviewError} from "../src/lib/business-review.ts";
const now=1_800_000_000;
const org="a12ef783-d60b-4427-aa62-d2562acd4cef";
const config=()=>({
 organization:org,initiator:"GMAKER0001",intentSha256:"d".repeat(64),
 requiredReviewers:2,issuedAtUnix:now-60,expiresAtUnix:now+60,
});
const reviewers=()=>[
 {organization:org,reviewer:"GREVIEWER01",role:"approver",recordedAtUnix:now-10},
 {organization:org,reviewer:"GREVIEWER02",role:"admin",recordedAtUnix:now-8},
];
test("review count remains disconnected from financial authorization",()=>{
 const assessment=assessBusinessReview(config(),reviewers(),now);
 assert.equal(assessment.reviewCountMet,true);
 assert.equal(assessment.financialExecutionAuthorized,false);
 assert.equal(assessBusinessReview(config(),[],now).remainingReviewers,2);
});
test("duplicate, cross tenant and self-approval are rejected",()=>{
 const mutations=[
  [a=>{a[0].organization="b12ef783-d60b-4427-aa62-d2562acd4cef";},"WRONG_ORGANIZATION"],
  [a=>{a[0].reviewer="GMAKER0001";},"SAME_INITIATOR"],
  [a=>{a[0].reviewer="GREVIEWER02";},"DUPLICATE_REVIEWER"],
  [a=>{a[0].role="operator";},"FORBIDDEN_ROLE"],
 ];
 for(const [mutate,code] of mutations){
  const values=reviewers();mutate(values);
  assert.throws(()=>assessBusinessReview(config(),values,now),
    e=>e instanceof BusinessReviewError&&e.code===code);
 }
});
test("business preview is blocked in the marketing build",async()=>{
 const route=await readFile("src/app/preview/approvals/page.tsx","utf8");
 const page=await readFile("src/components/business-review-workspace.tsx","utf8");
 assert.match(route,/STEALTHBRIDGE_SITE_MODE!=="preview"/);
 assert.match(route,/notFound\(\)/);
 assert.match(page,/readPlatformModules/);
 assert.match(page,/financialExecutionAuthorized/);
 assert.doesNotMatch(page,/submitPayment|signTransaction|sendTransaction/);
});
