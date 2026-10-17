"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Building2,LockKeyhole,ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readPlatformModules} from "@/lib/bridge-api";
import type {PlatformCatalog} from "@/lib/platform-modules";
import {assessBusinessReview,type BusinessReviewResult} from "@/lib/business-review";
import {digestBusinessEnvelope,type ReviewOperation} from "@/lib/business-envelope";

const fieldStyle={
 minWidth:0,width:"100%",padding:"0.75rem",borderRadius:"0.5rem",
 background:"transparent",border:"1px solid var(--border,#9ca3af)",
 color:"inherit"
} as const;
/** The user supplies real identifiers; no fake organization, member or payment is seeded. */
export function BusinessReviewWorkspace(){
 const [catalog,setCatalog]=useState<PlatformCatalog|null>(null);
 const [checked,setChecked]=useState(false);
 const [organization,setOrganization]=useState("");
 const [actor,setActor]=useState("");
 const [operation,setOperation]=useState<ReviewOperation>("invoice-review");
 const [reference,setReference]=useState("");
 const [requestKey,setRequestKey]=useState("");
 const [required,setRequired]=useState<2|3|4>(2);
 const [digest,setDigest]=useState<string|null>(null);
 const [review,setReview]=useState<BusinessReviewResult|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{
  const abort=new AbortController();
  readPlatformModules(abort.signal).then(value=>{
   if(!abort.signal.aborted){setCatalog(value);setChecked(true);}
  }).catch(()=>{if(!abort.signal.aborted){setCatalog(null);setChecked(true);}});
  return ()=>abort.abort();
 },[]);
 const approvals=catalog?.modules.find(item=>item.id==="approvals");
 const batches=catalog?.modules.find(item=>item.id==="batch-payouts");
 function clearResult(){setDigest(null);setReview(null);setError("");}
 async function calculate(){
  clearResult();
  try{
   const result=await digestBusinessEnvelope({
    organization,actor,operation,reference,requestKey,
   });
   const now=Math.floor(Date.now()/1000);
   const assessment=assessBusinessReview({
    organization,initiator:actor,intentSha256:result.sha256,
    requiredReviewers:required,issuedAtUnix:now,expiresAtUnix:now+3600,
   },[],now);
   setDigest(result.sha256);
   setReview(assessment);
  }catch{
   setError("Check the UUID and identifiers. Use an opaque ASCII actor (8–128), reference (8–64) and key (16–128). Nothing was sent.");
  }
 }
 return <div className="workspace-page preview-home">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · Read only</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={16} aria-hidden/> Workspace</Link>
  </header>
  <main className="workspace-main" id="main-content">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Business controls</span>
    <h1>Business reviews without payment authority.</h1>
    <p>Build an unsigned, network-bound fingerprint for your organization workflow.
    No fake customers or transactions are loaded, and no values are submitted to StealthBridge.</p>
   </div>
   <div className="registry-boundary"><LockKeyhole size={19} aria-hidden/>
    <p>Backend review storage exists but requires an authenticated, short-lived wallet-bound
    organization session and current tenant membership. The browser proxy does not forward
    authorization credentials. No payment, approval signature or write action is available here.</p>
   </div>
   <section aria-label="Canonical business review draft" style={{maxWidth:"800px"}}>
    <h2 className="preview-hub-title"><Building2 size={20} aria-hidden/> Local draft fingerprint</h2>
    <p>Enter an existing organization UUID and opaque identifiers—not private keys,
    names, payment amounts or personal information. The fingerprint is only a content hash.</p>
    <form onSubmit={event=>{event.preventDefault();void calculate();}}
     style={{display:"grid",gap:"1rem",marginTop:"1.25rem"}}>
     <label style={{display:"grid",gap:"0.4rem"}}>Organization UUID
      <input style={fieldStyle} type="text" value={organization} required autoComplete="off"
       maxLength={36} onChange={e=>{setOrganization(e.target.value);clearResult();}}
       placeholder="Organization UUID"/>
     </label>
     <label style={{display:"grid",gap:"0.4rem"}}>Public wallet account or opaque actor identifier
      <input style={fieldStyle} type="text" value={actor} required autoComplete="off"
       maxLength={128} onChange={e=>{setActor(e.target.value);clearResult();}}
       placeholder="Account or actor identifier"/>
     </label>
     <label style={{display:"grid",gap:"0.4rem"}}>Workflow
      <select style={fieldStyle} value={operation}
       onChange={e=>{setOperation(e.target.value as ReviewOperation);clearResult();}}>
       <option value="invoice-review">Invoice review</option>
       <option value="vendor-onboarding">Vendor onboarding</option>
       <option value="treasury-policy">Treasury policy</option>
      </select>
     </label>
     <label style={{display:"grid",gap:"0.4rem"}}>Opaque draft reference
      <input style={fieldStyle} type="text" value={reference} maxLength={64} required
       autoComplete="off" onChange={e=>{setReference(e.target.value);clearResult();}}
       placeholder="Letters, digits, hyphens or underscores"/>
     </label>
     <label style={{display:"grid",gap:"0.4rem"}}>Unique idempotency key
      <input style={fieldStyle} type="text" value={requestKey} maxLength={128} required
       autoComplete="off" onChange={e=>{setRequestKey(e.target.value);clearResult();}}
       placeholder="16–128 ASCII characters"/>
     </label>
     <fieldset style={{border:0,padding:0}}>
      <legend>Independent reviewers required</legend>
      <div className="preview-home-toolbar">
       {([2,3,4] as const).map(count=><Button key={count} type="button" size="sm"
        variant={required===count?"primary":"outline"} aria-pressed={required===count}
        onClick={()=>{setRequired(count);clearResult();}}>{count} reviewers</Button>)}
      </div>
     </fieldset>
     <Button type="submit" variant="primary">Calculate local SHA-256 fingerprint</Button>
    </form>
    {error&&<p role="alert">{error}</p>}
    {digest&&review&&<div className="registry-boundary" role="status" style={{marginTop:"1rem"}}>
     <div>
      <p>Unsigned draft SHA-256 fingerprint (not an approval):</p>
      <code data-testid="business-draft-sha256" style={{overflowWrap:"anywhere"}}>{digest}</code>
      <p data-testid="approval-record-count">Stored review records: not queried.
       Local input includes {review.distinctReviewers} verified reviews of {required} required.</p>
      <p>Financial execution: {review.financialExecutionAuthorized?"Enabled":"Disabled"}</p>
     </div>
    </div>}
   </section>
   <section aria-label="Backend module availability">
    <h2 className="preview-hub-title">Actual backend availability</h2>
    <div className="preview-link-grid">
     {([["Approval workflows",approvals],["Batch payouts",batches]] as const).map(([label,item])=>
      <article key={label} className="preview-link-card">
       <div className="preview-link-head"><ShieldCheck size={22} aria-hidden/>
        <span>{item?"Catalog verified":"Unavailable"}</span></div>
       <h3>{label}</h3>
       <p>{item?.description??"No trusted backend product inventory received."}</p>
       <span className="preview-link-end">{item?.availability??(checked?"Unavailable":"Checking…")}</span>
      </article>)}
    </div>
   </section>
   <p>Wallet-origin challenge handling, identity-bound session issuance and authenticated
    browser reads are separate release gates. Review counts cannot approve settlement.</p>
  </main>
  <footer className="workspace-footer">StealthBridge · Non-custodial business workflow · No payment writes</footer>
 </div>;
}
