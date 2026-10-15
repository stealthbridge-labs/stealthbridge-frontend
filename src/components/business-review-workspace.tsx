"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Building2,LockKeyhole,ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readPlatformModules} from "@/lib/bridge-api";
import type {PlatformCatalog} from "@/lib/platform-modules";
import {assessBusinessReview} from "@/lib/business-review";
import {digestBusinessEnvelope,type ReviewOperation} from "@/lib/business-envelope";

// Deterministic offline fixture: NOT an organization, signed approval, or money movement.
const FIXTURE_CLOCK=1_800_000_000;
const FIXTURE_ORGANIZATION="a12ef783-d60b-4427-aa62-d2562acd4cef";
const FICTIONAL_SUBJECT="GMAKER0001";
function previewCount(required:2|3|4){
 return assessBusinessReview({
  organization:FIXTURE_ORGANIZATION,initiator:FICTIONAL_SUBJECT,
  intentSha256:"d".repeat(64),requiredReviewers:required,
  issuedAtUnix:FIXTURE_CLOCK-10,expiresAtUnix:FIXTURE_CLOCK+600,
 },[],FIXTURE_CLOCK);
}

export function BusinessReviewWorkspace(){
 const [required,setRequired]=useState<2|3|4>(2);
 const [operation,setOperation]=useState<ReviewOperation>("invoice-review");
 const [reference,setReference]=useState("INVOICE_001");
 const [fingerprint,setFingerprint]=useState<string|null>(null);
 const [fingerprintError,setFingerprintError]=useState("");
 const [catalog,setCatalog]=useState<PlatformCatalog|null>(null);
 const [checked,setChecked]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();
  readPlatformModules(abort.signal).then(value=>{
   if(!abort.signal.aborted){setCatalog(value);setChecked(true);}
  }).catch(()=>{if(!abort.signal.aborted){setCatalog(null);setChecked(true);}});
  return ()=>abort.abort();
 },[]);
 const review=previewCount(required);
 const approvals=catalog?.modules.find(item=>item.id==="approvals");
 const batches=catalog?.modules.find(item=>item.id==="batch-payouts");
 return <div className="workspace-page preview-home">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · Design preview</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={16} aria-hidden/> Workspace</Link>
  </header>
  <main className="workspace-main" id="main-content">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Business controls</span>
    <h1>Separate review from execution.</h1>
    <p>Explore a proposed maker-checker approval rule. This local calculator has no real
    organizations, account signatures, member verification or settlement requests.</p>
   </div>
   <div className="registry-boundary"><LockKeyhole size={19} aria-hidden/>
    <p>Business approvals are not live. This page cannot authorize, sign, submit or pay anything.
    Role permissions must be enforced by a trusted tenant-scoped backend before future deployment.</p>
   </div>
   <section aria-label="Maker checker policy simulator">
    <h2 className="preview-hub-title"><Building2 size={20} aria-hidden/> Review rule preview</h2>
    <p>Choose a minimum number of independent reviewers. This is a synthetic policy
    configuration exercise, not evidence that anyone approved a transaction.</p>
    <div className="preview-home-toolbar" role="group" aria-label="Required independent reviewers">
     {([2,3,4] as const).map(count=><Button type="button" size="sm"
      key={count} variant={required===count?"primary":"outline"}
      aria-pressed={required===count} onClick={()=>setRequired(count)}>
      {count} reviewers</Button>)}
    </div>
    <div className="preview-health" aria-live="polite">
     <div><ShieldCheck size={19} aria-hidden/><span>Review records</span>
      <strong data-testid="approval-record-count">{review.distinctReviewers} / {required}</strong></div>
     <div><Building2 size={19} aria-hidden/><span>Additional reviews</span>
      <strong>{review.remainingReviewers}</strong></div>
     <div><ShieldCheck size={19} aria-hidden/><span>Count requirement</span>
      <strong>{review.reviewCountMet?"Met":"Not met"}</strong></div>
     <div><LockKeyhole size={19} aria-hidden/><span>Financial execution</span>
      <strong>{review.financialExecutionAuthorized?"Enabled":"Disabled"}</strong></div>
    </div>
   </section>
   <section aria-label="Canonical draft identity">
    <h2 className="preview-hub-title">Draft fingerprint (local demonstration)</h2>
    <p>This exercise calculates an unsigned Testnet-bound SHA-256 fingerprint from
    synthetic organization and maker identifiers. It does not create a draft
    on the backend, collect signatures, or authorize a payment.</p>
    <div className="preview-home-toolbar">
     <label htmlFor="business-draft-operation">Draft type</label>
     <select id="business-draft-operation" value={operation}
      onChange={event=>{
       setOperation(event.target.value as ReviewOperation);setFingerprint(null);setFingerprintError("");
      }} aria-label="Draft operation">
      <option value="invoice-review">Invoice review</option>
      <option value="vendor-onboarding">Vendor onboarding</option>
      <option value="treasury-policy">Treasury policy</option>
     </select>
     <label htmlFor="business-draft-reference">Reference identifier</label>
     <input id="business-draft-reference" value={reference} maxLength={64}
      onChange={event=>{setReference(event.target.value);setFingerprint(null);setFingerprintError("");}}
      placeholder="INVOICE_001" autoComplete="off" spellCheck={false}/>
     <Button type="button" variant="outline" size="sm"
      onClick={()=>{
       void digestBusinessEnvelope({
        organization:FIXTURE_ORGANIZATION,actor:FICTIONAL_SUBJECT,
        operation,reference,requestKey:"synthetic_business_request_0001"
       }).then(result=>{setFingerprint(result.sha256);setFingerprintError("");})
         .catch(()=>{setFingerprint(null);setFingerprintError("Use an ASCII reference of 8–64 letters, digits, hyphens or underscores.");});
      }}>Calculate local digest</Button>
    </div>
    {fingerprintError&&<p role="alert">{fingerprintError}</p>}
    {fingerprint&&<div className="registry-boundary" role="status">
     <p>Unsigned draft SHA-256 fingerprint (not an approval):</p>
     <code data-testid="business-draft-sha256" style={{overflowWrap:"anywhere"}}>{fingerprint}</code>
    </div>}
   </section>
   <section aria-label="Backend module availability">
    <h2 className="preview-hub-title">Backend availability</h2>
    <div className="preview-link-grid">
     {[["Approval workflows",approvals],["Batch payouts",batches]].map(([label,item])=>
      <article key={String(label)} className="preview-link-card">
       <div className="preview-link-head"><LockKeyhole size={22} aria-hidden/>
        <span>{item&&typeof item==="object"?"Read-only catalog":"Unverified"}</span></div>
       <h3>{String(label)}</h3>
       <p>{item&&typeof item==="object"?item.description:"No trusted backend product inventory received."}</p>
       <span className="preview-link-end">
        {item&&typeof item==="object"?item.availability:checked?"Unavailable":"Checking…"}
       </span>
      </article>)}
    </div>
   </section>
   <p>Later releases require verified wallet identity, current tenant roles, immutable quote and
    action digests, atomic approvals with revocation checks, audit records and independent payment authorization.</p>
  </main>
  <footer className="workspace-footer">StealthBridge · Business workflow research · No payment writes</footer>
 </div>;
}
